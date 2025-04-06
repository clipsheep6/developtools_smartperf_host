
/*
 * Copyright (C) 2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import { type SpSystemTrace } from '../SpSystemTrace';
import { TraceRow } from '../trace/base/TraceRow';
import { renders } from '../../database/ui-worker/ProcedureWorker';
import { type EmptyRender } from '../../database/ui-worker/cpu/ProcedureWorkerCPU';
import { type FreqExtendRender, CpuFreqExtendStruct } from '../../database/ui-worker/ProcedureWorkerFreqExtend';
import { type BinderRender, BinderStruct } from '../../database/ui-worker/procedureWorkerBinder';
import { type BaseStruct } from '../../bean/BaseStruct';
import { type AllStatesRender, AllstatesStruct } from '../../database/ui-worker/ProcedureWorkerAllStates';
import { StateGroup } from '../../bean/StateModle';
import { queryAllFuncNames } from '../../database/sql/Func.sql';
import { Utils } from '../trace/base/Utils';
import { TabPaneFreqUsage } from "../trace/sheet/frequsage/TabPaneFreqUsage";
const UNIT_HEIGHT: number = 20;
const MS_TO_US: number = 1000000;
const MIN_HEIGHT: number = 2;
export class SpSegmentationChart {
  static trace: SpSystemTrace;
  static cpuRow: TraceRow<CpuFreqExtendStruct> | undefined;
  static GpuRow: TraceRow<CpuFreqExtendStruct> | undefined;
  static binderRow: TraceRow<BinderStruct> | undefined;
  static schedRow: TraceRow<CpuFreqExtendStruct> | undefined;
  static freqInfoMapData = new Map<number, Map<number, number>>();
  static hoverLine: Array<HeightLine> = [];
  static tabHoverObj: { key: string, cycle: number };
  private rowFolder!: TraceRow<BaseStruct>;
  static chartData: Array<Object> = [];
  static statesRow: TraceRow<AllstatesStruct> | undefined;
  // 数据切割联动
  static setChartData(type: string, data: Array<FreqChartDataStruct>): void {
    SpSegmentationChart.tabHoverObj = { key: '', cycle: -1 };
    SpSegmentationChart.trace.traceSheetEL!.systemLogFlag = undefined;
    if (type === 'CPU-FREQ') {
      setCpuData(data);
    } else if (type === 'GPU-FREQ') {
      setGpuData(data);
    } else {
      setSchedData(data);
    }
    SpSegmentationChart.trace.refreshCanvas(false);
  }

  // state泳道联动
  static setStateChartData(data: Array<StateGroup>) {
    SpSegmentationChart.tabHoverObj = { key: '', cycle: -1 };
    SpSegmentationChart.trace.traceSheetEL!.systemLogFlag = undefined;
    let stateChartData = new Array();
    stateChartData = data.map(v => {
      return {
        dur: v.dur,
        chartDur: v.chartDur,
        pid: v.pid,
        tid: v.tid,
        end_ts: v.startTs! + v.chartDur!,
        id: v.id,
        name: 'all-state',
        startTime: v.startTs,
        start_ts: v.startTs,
        state: v.state,
        type: v.type,
        cycle: v.cycle,
      };
    });
    SpSegmentationChart.statesRow!.dataList = [];
    SpSegmentationChart.statesRow!.dataListCache = [];
    SpSegmentationChart.statesRow!.isComplete = false;
    // @ts-ignore
    SpSegmentationChart.statesRow!.supplier = (): Promise<Array<ThreadStruct>> =>
      new Promise<Array<AllstatesStruct>>((resolve) => resolve(stateChartData));
    SpSegmentationChart.trace.refreshCanvas(false);
  };

  // binder联动调用
  static setBinderChartData(data: Array<Array<FreqChartDataStruct>>): void {
    SpSegmentationChart.tabHoverObj = { key: '', cycle: -1 };
    SpSegmentationChart.trace.traceSheetEL!.systemLogFlag = undefined;
    BinderStruct.maxHeight = 0;
    SpSegmentationChart.binderRow!.dataList = [];
    SpSegmentationChart.binderRow!.dataListCache = [];
    SpSegmentationChart.binderRow!.isComplete = false;
    if (data.length === 0) {
      SpSegmentationChart.binderRow!.style.height = `40px`;
      SpSegmentationChart.binderRow!.funcMaxHeight = 40;
      // @ts-ignore
      SpSegmentationChart.binderRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
        new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    } else {
      let binderList: Array<FreqChartDataStruct> = [];
      let chartData: Array<FreqChartDataStruct> = [];
      setBinderData(data, binderList);
      chartData = binderList.map((v: FreqChartDataStruct) => {
        return {
          cpu:
            v.name === 'binder transaction'
              ? 0
              : v.name === 'binder transaction async'
                ? 1
                : v.name === 'binder reply'
                  ? MS_TO_US
                  : 3,
          startNS: v.startNS,
          dur: v.dur,
          name: `${v.name}`,
          value: v.value,
          depth: v.depth,
          cycle: v.cycle,
        };
      });
      // @ts-ignore
      SpSegmentationChart.binderRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
        new Promise<Array<FreqChartDataStruct>>((resolve) => resolve(chartData));
      SpSegmentationChart.binderRow!.style.height = `${BinderStruct.maxHeight > MIN_HEIGHT ? BinderStruct.maxHeight * UNIT_HEIGHT + UNIT_HEIGHT : 40}px`;
      SpSegmentationChart.binderRow!.funcMaxHeight = BinderStruct.maxHeight > MIN_HEIGHT ? BinderStruct.maxHeight * UNIT_HEIGHT + UNIT_HEIGHT : 40;
    }
    TraceRow.range!.refresh = true;
    SpSegmentationChart.binderRow!.needRefresh = true;
    SpSegmentationChart.binderRow!.draw(false);
    if (SpSegmentationChart.binderRow!.collect) {
      window.publish(window.SmartEvent.UI.RowHeightChange, {
        expand: SpSegmentationChart.binderRow!.funcExpand,
        value: SpSegmentationChart.binderRow!.funcMaxHeight - 40,
      });
    }
    SpSegmentationChart.trace.favoriteChartListEL?.scrollTo(0, 0);
    SpSegmentationChart.trace.refreshCanvas(false);
  }
  // 悬浮联动
  static tabHover(type: string, tableIsHover: boolean = false, cycle: number = -1): void {
    if (tableIsHover) {
      if (SpSegmentationChart.tabHoverObj.cycle === cycle && SpSegmentationChart.tabHoverObj.key === type) {
        SpSegmentationChart.tabHoverObj = { cycle: -1, key: '' };
      } else {
        SpSegmentationChart.tabHoverObj = { cycle, key: type };
      }
    } else {
      SpSegmentationChart.tabHoverObj = { cycle: -1, key: '' };
    }

    SpSegmentationChart.trace.refreshCanvas(false);
  }
  constructor(trace: SpSystemTrace) {
    SpSegmentationChart.trace = trace;
  }
  async init() {
    if (Utils.getInstance().getCallStatckMap().size > 0) {
      await this.initFolder();
      await this.initCpuFreq();
      await this.initGpuTrace();
      await this.initSchedTrace();
      await this.initBinderTrace();
      await this.initAllStates();
    } else {
      return;
    }
  }
  async initFolder() {
    let row = TraceRow.skeleton();
    row.rowId = 'segmentation';
    row.index = 0;
    row.rowType = TraceRow.ROW_TYPE_SPSEGNENTATION;
    row.rowParentId = '';
    row.folder = true;
    row.style.height = '40px';
    row.name = 'Segmentation';
    row.supplier = (): Promise<Array<BaseStruct>> => new Promise<Array<BaseStruct>>((resolve) => resolve([]));
    row.onThreadHandler = (useCache): void => {
      row.canvasSave(SpSegmentationChart.trace.canvasPanelCtx!);
      if (row.expansion) {
        SpSegmentationChart.trace.canvasPanelCtx?.clearRect(0, 0, row.frame.width, row.frame.height);
      } else {
        (renders['empty'] as EmptyRender).renderMainThread(
          {
            context: SpSegmentationChart.trace.canvasPanelCtx,
            useCache: useCache,
            type: '',
          },
          row
        );
      }
      row.canvasRestore(SpSegmentationChart.trace.canvasPanelCtx!);
    };
    this.rowFolder = row;
    SpSegmentationChart.trace.rowsEL?.appendChild(row);
  }
  async initCpuFreq() {
    // json文件泳道
    SpSegmentationChart.cpuRow = TraceRow.skeleton<CpuFreqExtendStruct>();
    SpSegmentationChart.cpuRow.rowId = 'cpu-freq';
    SpSegmentationChart.cpuRow.rowType = TraceRow.ROW_TYPE_CPU_COMPUTILITY;
    SpSegmentationChart.cpuRow.rowParentId = '';
    SpSegmentationChart.cpuRow.style.height = '40px';
    SpSegmentationChart.cpuRow.name = 'Cpu Computility';
    SpSegmentationChart.cpuRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.cpuRow.addRowCheckFilePop();
    SpSegmentationChart.cpuRow.rowSetting = 'checkFile';
    // 拿到了用户传递的数据
    SpSegmentationChart.cpuRow.onRowCheckFileChangeHandler = (): void => {
      SpSegmentationChart.freqInfoMapData = new Map<number, Map<number, number>>();
      if (sessionStorage.getItem('freqInfoData')) {
        // @ts-ignore
        let chartData = JSON.parse(JSON.parse(sessionStorage.getItem('freqInfoData')));
        let mapData = new Map<number, number>();
        // @ts-ignore
        chartData.map((v) => {
          for (let key in v.freqInfo) {
            mapData.set(Number(key), Number(v.freqInfo[key]));
          }
          SpSegmentationChart.freqInfoMapData.set(v.cpuId, mapData);
          mapData = new Map();
        });
        TabPaneFreqUsage.refresh();
      }
    };
    SpSegmentationChart.cpuRow.focusHandler = (ev): void => {
      SpSegmentationChart.trace?.displayTip(
        SpSegmentationChart.cpuRow!,
        CpuFreqExtendStruct.hoverStruct,
        `<span>${CpuFreqExtendStruct.hoverStruct === undefined ? 0 : CpuFreqExtendStruct.hoverStruct.value!
        }</span>`
      );
    };
    SpSegmentationChart.cpuRow.findHoverStruct = (): void => {
      CpuFreqExtendStruct.hoverStruct = SpSegmentationChart.cpuRow!.getHoverStruct();
    };
    // @ts-ignore
    SpSegmentationChart.cpuRow.supplier = (): Promise<Array<freqChartDataStruct>> =>
      new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    SpSegmentationChart.cpuRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.cpuRow!.currentContext) {
        context = SpSegmentationChart.cpuRow!.currentContext;
      } else {
        context = SpSegmentationChart.cpuRow!.collect
          ? SpSegmentationChart.trace.canvasFavoritePanelCtx!
          : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.cpuRow!.canvasSave(context);
      (renders['freq-extend'] as FreqExtendRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: 'CPU-FREQ',
        },
        SpSegmentationChart.cpuRow!
      );
      SpSegmentationChart.cpuRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.cpuRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.cpuRow);
  }
  async initGpuTrace() {
    SpSegmentationChart.GpuRow = TraceRow.skeleton<CpuFreqExtendStruct>();
    SpSegmentationChart.GpuRow.rowId = 'gpurow';
    SpSegmentationChart.GpuRow.rowType = TraceRow.ROW_TYPE_GPU_COMPUTILITY;
    SpSegmentationChart.GpuRow.rowParentId = '';
    SpSegmentationChart.GpuRow.style.height = '40px';
    SpSegmentationChart.GpuRow.name = 'Gpu Computility';
    SpSegmentationChart.GpuRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.GpuRow.selectChangeHandler = SpSegmentationChart.trace.selectChangeHandler;
    // @ts-ignore
    SpSegmentationChart.GpuRow.supplier = (): Promise<Array<freqChartDataStruct>> =>
      new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    SpSegmentationChart.GpuRow.focusHandler = (ev): void => {
      SpSegmentationChart.trace?.displayTip(
        SpSegmentationChart.GpuRow!,
        CpuFreqExtendStruct.hoverStruct,
        `<span>${CpuFreqExtendStruct.hoverStruct === undefined ? 0 : CpuFreqExtendStruct.hoverStruct.value!
        }</span>`
      );
    };
    SpSegmentationChart.GpuRow.findHoverStruct = (): void => {
      CpuFreqExtendStruct.hoverStruct = SpSegmentationChart.GpuRow!.getHoverStruct();
    };
    SpSegmentationChart.GpuRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.GpuRow!.currentContext) {
        context = SpSegmentationChart.GpuRow!.currentContext;
      } else {
        context = SpSegmentationChart.GpuRow!.collect
          ? SpSegmentationChart.trace.canvasFavoritePanelCtx!
          : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.GpuRow!.canvasSave(context);
      (renders['freq-extend'] as FreqExtendRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: 'GPU-FREQ',
        },
        SpSegmentationChart.GpuRow!
      );
      SpSegmentationChart.GpuRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.GpuRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.GpuRow);
  }
  async initSchedTrace() {
    SpSegmentationChart.schedRow = TraceRow.skeleton<CpuFreqExtendStruct>();
    SpSegmentationChart.schedRow.rowId = 'sched_switch Count';
    SpSegmentationChart.schedRow.rowType = TraceRow.ROW_TYPE_SCHED_SWITCH;
    SpSegmentationChart.schedRow.rowParentId = '';
    SpSegmentationChart.schedRow.style.height = '40px';
    SpSegmentationChart.schedRow.name = 'Sched_switch Count';
    SpSegmentationChart.schedRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.schedRow.selectChangeHandler = SpSegmentationChart.trace.selectChangeHandler;
    SpSegmentationChart.schedRow.focusHandler = (ev): void => {
      SpSegmentationChart.trace?.displayTip(
        SpSegmentationChart.schedRow!,
        CpuFreqExtendStruct.hoverStruct,
        `<span>${CpuFreqExtendStruct.hoverStruct?.value!}</span>`
      );
    };
    SpSegmentationChart.schedRow.findHoverStruct = (): void => {
      CpuFreqExtendStruct.hoverStruct = SpSegmentationChart.schedRow!.getHoverStruct();
    };
    // @ts-ignore
    SpSegmentationChart.schedRow.supplier = (): Promise<Array<freqChartDataStruct>> =>
      new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    SpSegmentationChart.schedRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.schedRow!.currentContext) {
        context = SpSegmentationChart.schedRow!.currentContext;
      } else {
        context = SpSegmentationChart.schedRow!.collect
          ? SpSegmentationChart.trace.canvasFavoritePanelCtx!
          : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.schedRow!.canvasSave(context);
      (renders['freq-extend'] as FreqExtendRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: 'SCHED-SWITCH',
        },
        SpSegmentationChart.schedRow!
      );
      SpSegmentationChart.schedRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.schedRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.schedRow);
  }

  async initAllStates() {
    SpSegmentationChart.statesRow = TraceRow.skeleton<AllstatesStruct>();
    SpSegmentationChart.statesRow.rowId = `statesrow`;
    SpSegmentationChart.statesRow.rowType = TraceRow.ROW_TYPE_THREAD;
    SpSegmentationChart.statesRow.rowParentId = '';
    SpSegmentationChart.statesRow.style.height = '30px';
    SpSegmentationChart.statesRow.name = `All States`;
    SpSegmentationChart.statesRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.statesRow.selectChangeHandler = SpSegmentationChart.trace.selectChangeHandler;
    // @ts-ignore
    SpSegmentationChart.statesRow.supplier = (): Promise<Array<freqChartDataStruct>> =>
      new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    SpSegmentationChart.statesRow.onThreadHandler = (useCache) => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.statesRow!.currentContext) {
        context = SpSegmentationChart.statesRow!.currentContext;
      } else {
        context = SpSegmentationChart.statesRow!.collect ? SpSegmentationChart.trace.canvasFavoritePanelCtx! : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.statesRow!.canvasSave(context);
      (renders.stateCut as AllStatesRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: ``,
          translateY: SpSegmentationChart.statesRow!.translateY,
        },
        SpSegmentationChart.statesRow!
      );
      SpSegmentationChart.statesRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.statesRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.statesRow);
  }

  async initBinderTrace() {
    SpSegmentationChart.binderRow = TraceRow.skeleton<BinderStruct>();
    SpSegmentationChart.binderRow.rowId = 'binderrow';
    SpSegmentationChart.binderRow.rowType = TraceRow.ROW_TYPE_BINDER_COUNT;
    SpSegmentationChart.binderRow.enableCollapseChart(40, SpSegmentationChart.trace);
    SpSegmentationChart.binderRow.rowParentId = '';
    SpSegmentationChart.binderRow.name = 'Binder Count';
    SpSegmentationChart.binderRow.style.height = '40px';
    SpSegmentationChart.binderRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.binderRow.selectChangeHandler = SpSegmentationChart.trace.selectChangeHandler;
    SpSegmentationChart.binderRow.findHoverStruct = () => {
      BinderStruct.hoverCpuFreqStruct = SpSegmentationChart.binderRow!.dataListCache.find((v: BinderStruct) => {
        if (SpSegmentationChart.binderRow!.isHover) {
          if (v.frame!.x < SpSegmentationChart.binderRow!.hoverX + 1 &&
            v.frame!.x + v.frame!.width > SpSegmentationChart.binderRow!.hoverX - 1 &&
            (BinderStruct.maxHeight * 20 - v.depth * 20 + 20) < SpSegmentationChart.binderRow!.hoverY &&
            BinderStruct.maxHeight * 20 - v.depth * 20 + v.value * 20 + 20 > SpSegmentationChart.binderRow!.hoverY) {
            return v;
          }
        }
      })
    };
    SpSegmentationChart.binderRow.focusHandler = (ev): void => {
      SpSegmentationChart.trace!.displayTip(
        SpSegmentationChart.binderRow!,
        BinderStruct.hoverCpuFreqStruct,
        `<span style='font-weight: bold;'>Cycle: ${BinderStruct.hoverCpuFreqStruct ? BinderStruct.hoverCpuFreqStruct.cycle : 0
        }</span><br>
                <span style='font-weight: bold;'>Name: ${BinderStruct.hoverCpuFreqStruct ? BinderStruct.hoverCpuFreqStruct.name : ''
        }</span><br>
                <span style='font-weight: bold;'>Count: ${BinderStruct.hoverCpuFreqStruct ? BinderStruct.hoverCpuFreqStruct.value : 0
        }</span>`
      );
    };

    SpSegmentationChart.binderRow.supplier = (): Promise<Array<BinderStruct>> =>
      new Promise<Array<BinderStruct>>((resolve) => resolve([]));
    SpSegmentationChart.binderRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.binderRow!.currentContext) {
        context = SpSegmentationChart.binderRow!.currentContext;
      } else {
        context = SpSegmentationChart.binderRow!.collect
          ? SpSegmentationChart.trace.canvasFavoritePanelCtx!
          : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.binderRow!.canvasSave(context);
      (renders.binder as BinderRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: 'BINDER',
        },
        SpSegmentationChart.binderRow!
      );
      SpSegmentationChart.binderRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.binderRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.binderRow);
  }
}
class FreqChartDataStruct {
  colorIndex?: number = 0;
  dur: number = 0;
  value: number = 0;
  startNS: number = 0;
  cycle: number = 0;
  depth?: number = 1;
  name?: string = '';
}

function setCpuData(data: Array<FreqChartDataStruct>) {
  let currentMaxValue = 0;
  data.map((v: FreqChartDataStruct) => {
    if (v.value > currentMaxValue) {
      currentMaxValue = v.value;
    }
  });
  CpuFreqExtendStruct.hoverType = 'CPU-FREQ';
  CpuFreqExtendStruct.cpuMaxValue = currentMaxValue;
  SpSegmentationChart.cpuRow!.dataList = [];
  SpSegmentationChart.cpuRow!.dataListCache = [];
  SpSegmentationChart.cpuRow!.isComplete = false;
  // @ts-ignore
  SpSegmentationChart.cpuRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
    new Promise<Array<FreqChartDataStruct>>((resolve) => resolve(data));
}
function setGpuData(data: Array<FreqChartDataStruct>): void {
  let currentMaxValue = 0;
  data.map((v: FreqChartDataStruct) => {
    if (v.value && v.value > currentMaxValue!) {
      currentMaxValue = v.value;
    }
  });
  CpuFreqExtendStruct.hoverType = 'GPU-FREQ';
  CpuFreqExtendStruct.gpuMaxValue = currentMaxValue;
  SpSegmentationChart.GpuRow!.dataList = [];
  SpSegmentationChart.GpuRow!.dataListCache = [];
  SpSegmentationChart.GpuRow!.isComplete = false;
  // @ts-ignore
  SpSegmentationChart.GpuRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
    new Promise<Array<FreqChartDataStruct>>((resolve) => resolve(data));
}
function setSchedData(data: Array<FreqChartDataStruct>): void {
  let currentMaxValue = 0;
  data.map((v: FreqChartDataStruct) => {
    if (v.value && v.value > currentMaxValue!) {
      currentMaxValue = v.value;
    }
  });
  CpuFreqExtendStruct.hoverType = 'SCHED-SWITCH';
  CpuFreqExtendStruct.schedMaxValue = currentMaxValue!;
  SpSegmentationChart.schedRow!.dataList = [];
  SpSegmentationChart.schedRow!.dataListCache = [];
  SpSegmentationChart.schedRow!.isComplete = false;
  // @ts-ignore
  SpSegmentationChart.schedRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
    new Promise<Array<FreqChartDataStruct>>((resolve) => resolve(data));
}
function setBinderData(data: Array<Array<FreqChartDataStruct>>, binderList: Array<FreqChartDataStruct>): void {
  data.map((v: Array<FreqChartDataStruct>) => {
    // 统计每一竖列的最大count
    let listCount = 0;
    v.map((t: FreqChartDataStruct) => {
      listCount += t.value;
      if (t.name === 'binder transaction') {
        t.depth = t.value;
      }
      if (t.name === 'binder transaction async') {
        t.depth =
          t.value +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction';
            })[0].value
            : 0);
      }
      if (t.name === 'binder reply') {
        t.depth =
          t.value +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction';
            })[0].value
            : 0) +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction async';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction async';
            })[0].value
            : 0);
      }
      if (t.name === 'binder async rcv') {
        t.depth =
          t.value +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction';
            })[0].value
            : 0) +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction async';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction async';
            })[0].value
            : 0) +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder reply';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder reply';
            })[0].value
            : 0);
      }
      binderList.push(t);
    });
    BinderStruct.maxHeight =
      BinderStruct.maxHeight > listCount ? BinderStruct.maxHeight : JSON.parse(JSON.stringify(listCount));
    listCount = 0;
  });
}

class HeightLine {
  key: string = '';
  cycle: number = -1;
}
/*
 * Copyright (C) 2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { convertJSON, LogicHandler } from './ProcedureLogicWorkerCommon';

interface SPT {
  title: string;
  count: number;
  wallDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: string;
  children: Array<SPT>;
  state: string;
  pid: number;
  tid: number;
}

export class ProcedureLogicWorkerSPT extends LogicHandler {
  threadSlice: Array<ThreadSlice> = [];
  currentEventId: string = '';

  clearAll(): void {
    this.threadSlice.length = 0;
  }

  handle(data: unknown): void {
    //@ts-ignore
    this.currentEventId = data.id;
    //@ts-ignore
    if (data && data.type) {
      //@ts-ignore
      switch (data.type) {
        case 'spt-init':
          this.sptInit(data);
          break;
        case 'spt-getPTS':
          //@ts-ignore
          this.sptGetPTS(data.params);
          break;
        case 'spt-getSPT':
          //@ts-ignore
          this.sptGetSPT(data.params);
          break;
        case 'spt-getCpuPriority':
          this.sptGetCpuPriority();
          break;
        case 'spt-getCpuPriorityByTime':
          //@ts-ignore
          this.sptGetCpuPriorityByTime(data.params);
          break;
      }
    }
  }
  private sptInit(data: unknown): void {
    //@ts-ignore
    if (data.params.list) {
      //@ts-ignore
      this.threadSlice = convertJSON(data.params.list);
      self.postMessage({
        id: this.currentEventId,
        action: 'spt-init',
        results: [],
      });
    } else {
      this.getThreadState();
    }
  }

  private sptGetPTS(params: { leftNs: number; rightNs: number; cpus: Array<number> }): void {
    self.postMessage({
      id: this.currentEventId,
      action: 'spt-getPTS',
      results: this.getPTSData(params.leftNs, params.rightNs, params.cpus),
    });
  }
  private sptGetSPT(params: { leftNs: number; rightNs: number; cpus: Array<number> }): void {
    self.postMessage({
      id: this.currentEventId,
      action: 'spt-getSPT',
      results: this.getSPTData(params.leftNs, params.rightNs, params.cpus),
    });
  }
  private sptGetCpuPriority(): void {
    self.postMessage({
      id: this.currentEventId,
      action: 'spt-getCpuPriority',
      results: this.threadSlice,
    });
  }
  private sptGetCpuPriorityByTime(params: { leftNs: number; rightNs: number; cpus: Array<number> }): void {
    const result = this.threadSlice.filter((item: ThreadSlice) => {
      return !(item.endTs! < params.leftNs || item.startTs! > params.rightNs);
    });
    self.postMessage({
      id: this.currentEventId,
      action: 'spt-getCpuPriorityByTime',
      results: result,
    });
  }
  queryData(queryName: string, sql: string, args: unknown): void {
    self.postMessage({
      id: this.currentEventId,
      type: queryName,
      isQuery: true,
      args: args,
      sql: sql,
    });
  }

  getThreadState(): void {
    this.queryData(
      'spt-init',
      `
    select
       state,
       dur,
       (ts - start_ts) as startTs,
       (ts - start_ts + dur) as endTs,
       cpu,
       tid,
       itid as itId,
       arg_setid as argSetID,
       pid
from thread_state,trace_range where dur > 0 and (ts - start_ts) >= 0;
`,
      {}
    );
  }

  private getPTSData(ptsLeftNs: number, ptsRightNs: number, cpus: Array<number>): unknown[] {
    let ptsFilter = this.threadSlice.filter(
      (it) =>
        Math.max(ptsLeftNs, it.startTs!) < Math.min(ptsRightNs, it.startTs! + it.dur!) &&
        (it.cpu === null || it.cpu === undefined || cpus.includes(it.cpu))
    );
    let group: unknown = {};
    ptsFilter.forEach((slice) => {
      let title = `S-${slice.state}`;
      let item = this.setStateData(slice, title) as SPT;
      //@ts-ignore
      if (group[`${slice.pid}`]) {
        //@ts-ignore
        let process = group[`${slice.pid}`] as SPT;
        process.count += 1;
        process.wallDuration += slice.dur!;
        process.minDuration = Math.min(process.minDuration, slice.dur!);
        process.maxDuration = Math.max(process.maxDuration, slice.dur!);
        process.avgDuration = (process.wallDuration / process.count).toFixed(2);
        let thread = process.children.find((child: SPT) => child.title === `T-${slice.tid}`);
        if (thread) {
          thread.count += 1;
          thread.wallDuration += slice.dur!;
          thread.minDuration = Math.min(thread.minDuration, slice.dur!);
          thread.maxDuration = Math.max(thread.maxDuration, slice.dur!);
          thread.avgDuration = (thread.wallDuration / thread.count).toFixed(2);
          let state = thread.children.find((child: SPT) => child.title === `S-${slice.state}`);
          if (state) {
            state.count += 1;
            state.wallDuration += slice.dur!;
            state.minDuration = Math.min(state.minDuration, slice.dur!);
            state.maxDuration = Math.max(state.maxDuration, slice.dur!);
            state.avgDuration = (state.wallDuration / state.count).toFixed(2);
          } else {
            thread.children.push(item);
          }
        } else {
          let processChild = this.setThreadData(slice, item) as SPT;
          process.children.push(processChild);
        }
      } else {
        //@ts-ignore
        group[`${slice.pid}`] = this.setProcessData(slice, item);
      }
    });
    //@ts-ignore
    return Object.values(group);
  }
  private setStateData(slice: ThreadSlice, title: string): unknown {
    return {
      title: title,
      count: 1,
      state: slice.state,
      tid: slice.tid,
      pid: slice.pid,
      minDuration: slice.dur || 0,
      maxDuration: slice.dur || 0,
      wallDuration: slice.dur || 0,
      avgDuration: `${slice.dur}`,
    };
  }
  private setProcessData(slice: ThreadSlice, item: SPT): unknown {
    return {
      title: `P-${slice.pid}`,
      count: 1,
      pid: slice.pid,
      minDuration: slice.dur || 0,
      maxDuration: slice.dur || 0,
      wallDuration: slice.dur || 0,
      avgDuration: `${slice.dur}`,
      children: [
        {
          title: `T-${slice.tid}`,
          count: 1,
          pid: slice.pid,
          tid: slice.tid,
          minDuration: slice.dur || 0,
          maxDuration: slice.dur || 0,
          wallDuration: slice.dur || 0,
          avgDuration: `${slice.dur}`,
          children: [item],
        },
      ],
    };
  }
  private setThreadData(slice: ThreadSlice, item: SPT): unknown {
    return {
      title: `T-${slice.tid}`,
      count: 1,
      tid: slice.tid,
      pid: slice.pid,
      minDuration: slice.dur || 0,
      maxDuration: slice.dur || 0,
      wallDuration: slice.dur || 0,
      avgDuration: `${slice.dur}`,
      children: [item],
    };
  }
  private getSPTData(sptLeftNs: number, sptRightNs: number, cpus: Array<number>): unknown {
    let sptFilter = this.threadSlice.filter(
      (it) =>
        Math.max(sptLeftNs, it.startTs!) < Math.min(sptRightNs, it.startTs! + it.dur!) &&
        (it.cpu === null || it.cpu === undefined || cpus.includes(it.cpu))
    );
    let group: unknown = {};
    sptFilter.forEach((slice) => {
      let item = {
        title: `T-${slice.tid}`,
        count: 1,
        state: slice.state,
        pid: slice.pid,
        tid: slice.tid,
        minDuration: slice.dur || 0,
        maxDuration: slice.dur || 0,
        wallDuration: slice.dur || 0,
        avgDuration: `${slice.dur}`,
      } as SPT;
      //@ts-ignore
      if (group[`${slice.state}`]) {
        this.setSPTData(group, slice, item);
      } else {
        //@ts-ignore
        group[`${slice.state}`] = {
          title: `S-${slice.state}`,
          count: 1,
          state: slice.state,
          minDuration: slice.dur || 0,
          maxDuration: slice.dur || 0,
          wallDuration: slice.dur || 0,
          avgDuration: `${slice.dur}`,
          children: [
            {
              title: `P-${slice.pid}`,
              count: 1,
              state: slice.state,
              pid: slice.pid,
              minDuration: slice.dur || 0,
              maxDuration: slice.dur || 0,
              wallDuration: slice.dur || 0,
              avgDuration: `${slice.dur}`,
              children: [item],
            },
          ],
        };
      }
    });
    //@ts-ignore
    return Object.values(group);
  }
  private setSPTData(group: unknown, slice: ThreadSlice, item: SPT): void {
    //@ts-ignore
    let state = group[`${slice.state}`];
    state.count += 1;
    state.wallDuration += slice.dur;
    state.minDuration = Math.min(state.minDuration, slice.dur!);
    state.maxDuration = Math.max(state.maxDuration, slice.dur!);
    state.avgDuration = (state.wallDuration / state.count).toFixed(2);
    let process = state.children.find((child: SPT) => child.title === `P-${slice.pid}`);
    if (process) {
      process.count += 1;
      process.wallDuration += slice.dur;
      process.minDuration = Math.min(process.minDuration, slice.dur!);
      process.maxDuration = Math.max(process.maxDuration, slice.dur!);
      process.avgDuration = (process.wallDuration / process.count).toFixed(2);
      let thread = process.children.find((child: SPT) => child.title === `T-${slice.tid}`);
      if (thread) {
        thread.count += 1;
        thread.wallDuration += slice.dur;
        thread.minDuration = Math.min(thread.minDuration, slice.dur!);
        thread.maxDuration = Math.max(thread.maxDuration, slice.dur!);
        thread.avgDuration = (thread.wallDuration / thread.count).toFixed(2);
      } else {
        process.children.push(item);
      }
    } else {
      state.children.push({
        title: `P-${slice.pid}`,
        count: 1,
        state: slice.state,
        pid: slice.pid,
        minDuration: slice.dur || 0,
        maxDuration: slice.dur || 0,
        wallDuration: slice.dur || 0,
        avgDuration: `${slice.dur}`,
        children: [item],
      });
    }
  }
}

export class ThreadSlice {
  state?: string;
  dur?: number;
  startTs?: number;
  endTs?: number;
  cpu?: number | null;
  tid?: number;
  pid?: number;
  itId?: number;
  priorityType?: string;
  end_state?: string;
  priority?: number;
  argSetID?: number;
}
/*
 * Copyright (C) 2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BaseElement, element } from '../../../base-ui/BaseElement';
import { TimeRuler } from './timer-shaft/TimeRuler';
import { Rect } from './timer-shaft/Rect';
import { RangeRuler, TimeRange } from './timer-shaft/RangeRuler';
import { SlicesTime, SportRuler } from './timer-shaft/SportRuler';
import { procedurePool } from '../../database/Procedure';
import { Flag } from './timer-shaft/Flag';
import { info } from '../../../log/Log';
import { TraceSheet } from './base/TraceSheet';
import { SelectionParam } from '../../bean/BoxSelection';
import { type SpSystemTrace, CurrentSlicesTime } from '../SpSystemTrace';
import './timer-shaft/CollapseButton';
import { TimerShaftElementHtml } from './TimerShaftElement.html';
import { SpChartList } from './SpChartList';
//随机生成十六位进制颜色
//@ts-ignore
export function randomRgbColor(): string {
  let r = Math.floor(Math.random() * 255);
  let g = Math.floor(Math.random() * 255);
  let b = Math.floor(Math.random() * 255);
  if (r * 0.299 + g * 0.587 + b * 0.114 < 192) {
    let r16 = r.toString(16).length === 1 && r.toString(16) <= 'f' ? 0 + r.toString(16) : r.toString(16);
    let g16 = g.toString(16).length === 1 && g.toString(16) <= 'f' ? 0 + g.toString(16) : g.toString(16);
    let b16 = b.toString(16).length === 1 && b.toString(16) <= 'f' ? 0 + b.toString(16) : b.toString(16);
    let color = '#' + r16 + g16 + b16;
    return color;
  } else {
    randomRgbColor();
  }
}

export function ns2s(ns: number): string {
  let oneSecond = 1_000_000_000; // 1 second
  let oneMillisecond = 1_000_000; // 1 millisecond
  let oneMicrosecond = 1_000; // 1 microsecond
  let nanosecond1 = 1000.0;
  let result;
  if (ns >= oneSecond) {
    result = (ns / 1000 / 1000 / 1000).toFixed(1) + ' s';
  } else if (ns >= oneMillisecond) {
    result = (ns / 1000 / 1000).toFixed(1) + ' ms';
  } else if (ns >= oneMicrosecond) {
    result = (ns / 1000).toFixed(1) + ' μs';
  } else if (ns > 0) {
    result = ns.toFixed(1) + ' ns';
  } else {
    result = ns.toFixed(1) + ' s';
  }
  return result;
}

export function ns2UnitS(ns: number, scale: number): string {
  let oneSecond = 1_000_000_000; // 1 second
  let result;
  if (scale >= 10_000_000_000) {
    result = (ns / oneSecond).toFixed(0) + ' s';
  } else if (scale >= 1_000_000_000) {
    result = (ns / oneSecond).toFixed(1) + ' s';
  } else if (scale >= 100_000_000) {
    result = (ns / oneSecond).toFixed(2) + ' s';
  } else if (scale >= 10_000_000) {
    result = (ns / oneSecond).toFixed(3) + ' s';
  } else if (scale >= 1_000_000) {
    result = (ns / oneSecond).toFixed(4) + ' s';
  } else if (scale >= 100_000) {
    result = (ns / oneSecond).toFixed(5) + ' s';
  } else {
    result = (ns / oneSecond).toFixed(6) + ' s';
  }
  return result;
}

export function ns2x(ns: number, startNS: number, endNS: number, duration: number, rect: Rect): number {
  if (endNS === 0) {
    endNS = duration;
  }
  let xSize: number = ((ns - startNS) * rect.width) / (endNS - startNS);
  if (xSize < 0) {
    xSize = 0;
  }
  if (xSize > rect.width) {
    xSize = rect.width;
  }
  return xSize;
}

@element('timer-shaft-element')
export class TimerShaftElement extends BaseElement {
  // @ts-ignore
  offscreen: OffscreenCanvas | undefined;
  isOffScreen: boolean = false;
  public ctx: CanvasRenderingContext2D | undefined | null;
  public canvas: HTMLCanvasElement | null | undefined;
  public totalEL: HTMLDivElement | null | undefined;
  public timeTotalEL: HTMLSpanElement | null | undefined;
  public timeOffsetEL: HTMLSpanElement | null | undefined;
  public collectGroup: HTMLDivElement | null | undefined;
  public collect1: HTMLInputElement | null | undefined;
  public loadComplete: boolean = false;
  public collecBtn: HTMLElement | null | undefined;
  rangeChangeHandler: ((timeRange: TimeRange) => void) | undefined = undefined;
  rangeClickHandler: ((sliceTime: SlicesTime | undefined | null) => void) | undefined = undefined;
  flagChangeHandler: ((hoverFlag: Flag | undefined | null, selectFlag: Flag | undefined | null) => void) | undefined =
    undefined;
  flagClickHandler: ((flag: Flag | undefined | null) => void) | undefined = undefined;
  /**
   * 离线渲染需要的变量
   */
  dpr = window.devicePixelRatio || 1;
  frame: Rect = new Rect(0, 0, 0, 0);
  must: boolean = true;
  hoverX: number = 0;
  hoverY: number = 0;
  canvasWidth: number = 0;
  canvasHeight: number = 0;
  _cpuUsage: Array<{ cpu: number; ro: number; rate: number }> = [];
  protected timeRuler: TimeRuler | undefined;
  protected _rangeRuler: RangeRuler | undefined;
  protected _sportRuler: SportRuler | undefined;
  private root: HTMLDivElement | undefined | null;
  private _totalNS: number = 10_000_000_000;
  private _startNS: number = 0;
  private _endNS: number = 10_000_000_000;
  private traceSheetEL: TraceSheet | undefined | null;
  private sliceTime: SlicesTime | undefined | null;
  public selectionList: Array<SelectionParam> = [];
  public selectionMap: Map<string, SelectionParam> = new Map<string, SelectionParam>();
  public usageEL: HTMLDivElement | null | undefined;
  public timerShaftEL: TimerShaftElement | null | undefined;
  public rowsPaneEL: HTMLDivElement | null | undefined;
  public favoriteChartListEL: SpChartList | undefined | null;
  _checkExpand: boolean = false; //是否展开
  _usageFoldHeight: number = 56.25; //初始化时折叠的负载区高度
  usageExpandHeight: number = 75; //给定的展开的负载区高度
  _cpuUsageCount: Array<{ cpu: number; ro: number; rate: number }> = [];

  get sportRuler(): SportRuler | undefined {
    return this._sportRuler;
  }

  get rangeRuler(): RangeRuler | undefined {
    return this._rangeRuler;
  }

  set cpuUsage(value: Array<{ cpu: number; ro: number; rate: number }>) {
    info('set cpuUsage values :', value);
    this._cpuUsage = value;

    this._cpuUsageCount = value;
    if (this._cpuUsageCount.length) {
      this.usageEL!.innerHTML = 'CPU Usage';
    }

    if (this._rangeRuler) {
      this._rangeRuler.cpuUsage = this._cpuUsage;
    }
  }

  get checkExpand(): boolean {
    return this._checkExpand;
  }

  set checkExpand(value: boolean) {
    this._checkExpand = value;
  }

  get usageFoldHeight(): number {
    return this._usageFoldHeight;
  }
  set usageFoldHeight(value: number) {
    this._usageFoldHeight = value;
  }

  get totalNS(): number {
    return this._totalNS;
  }

  set totalNS(value: number) {
    info('set totalNS values :', value);
    this._totalNS = value;
    if (this.timeRuler) {
      this.timeRuler.totalNS = value;
    }
    if (this._rangeRuler) {
      this._rangeRuler.range.totalNS = value;
    }
    if (this.timeTotalEL) {
      this.timeTotalEL.textContent = `${ns2s(value)}`;
    }
    requestAnimationFrame(() => this.render());
  }

  get startNS(): number {
    return this._startNS;
  }

  set startNS(value: number) {
    this._startNS = value;
  }

  get endNS(): number {
    return this._endNS;
  }

  set endNS(value: number) {
    this._endNS = value;
  }

  reset(): void {
    this.loadComplete = false;
    this.totalNS = 10_000_000_000;
    this.startNS = 0;
    this.endNS = 10_000_000_000;
    if (this._rangeRuler) {
      this._rangeRuler.drawMark = false;
      this._rangeRuler.range.totalNS = this.totalNS;
      this._rangeRuler.markAObj.frame.x = 0;
      this._rangeRuler.markBObj.frame.x = this._rangeRuler.frame.width;
      this._rangeRuler.cpuUsage = [];
      this.sportRuler!.flagList.length = 0;
      this.sportRuler!.slicesTimeList.length = 0;
      this.selectionList.length = 0;
      this.selectionMap.clear();
      this._rangeRuler.rangeRect = new Rect(0, 25, this.canvas?.clientWidth || 0, 75);
      this.sportRuler!.isRangeSelect = false;
      this.setSlicesMark();
    }
    this.removeTriangle('inverted');
    this.setRangeNS(0, this.endNS);
    //---------------每次导入trace时触发渲染-----------------
    if (this._rangeRuler && this._sportRuler) {
      this.canvas!.width = this.canvas!.clientWidth || 0;
      sessionStorage.setItem('foldHeight', String(56.25));
      if (this._checkExpand && this._checkExpand === true) {
        this._checkExpand = false;
        sessionStorage.setItem('expand', String(this._checkExpand));
      }
      sessionStorage.setItem('expand', String(this._checkExpand));
      this.usageEL!.innerHTML = '';
      this.usageEL!.style.height = `${100 - 56.25}px`;
      this.usageEL!.style.lineHeight = `${100 - 56.25}px`;
      this.timerShaftEL!.style.height = `${146 - 56.25 + 2}px`;
      this.canvas!.style.height = `${146 - 56.25}px`;
      this.canvas!.height = 146 - 56.25;
      this.rowsPaneEL!.style.maxHeight = '100%';
      this._sportRuler.frame.y = 43.75;

      this.render();
      this._checkExpand = true;
      this._cpuUsageCount = []; //清空判断数据
    }
  }

  initElements(): void {
    this.root = this.shadowRoot?.querySelector('.root');
    this.canvas = this.shadowRoot?.querySelector('.panel');
    this.totalEL = this.shadowRoot?.querySelector('.total');
    this.collect1 = this.shadowRoot?.querySelector('#collect1');
    this.timeTotalEL = this.shadowRoot?.querySelector('.time-total');
    this.timeOffsetEL = this.shadowRoot?.querySelector('.time-offset');
    this.collecBtn = this.shadowRoot?.querySelector('.time-collect');
    this.collectGroup = this.shadowRoot?.querySelector('.collect_group');
    this.collectGroup?.addEventListener('click', (e) => {
      // @ts-ignore
      if (e.target && e.target.tagName === 'INPUT') {
        // @ts-ignore
        window.publish(window.SmartEvent.UI.CollectGroupChange, e.target.value);
      }
    });
    // @ts-ignore
    procedurePool.timelineChange = (a: unknown): void => this.rangeChangeHandler?.(a);
    // @ts-ignore
    window.subscribe(window.SmartEvent.UI.TimeRange, (b) => this.setRangeNS(b.startNS, b.endNS));
    // -----------------------------点击负载区展开折叠---------------------------------
    this.usageEL = this.shadowRoot?.querySelector('.cpu-usage');
    this.timerShaftEL = this.shadowRoot!.host.parentNode?.querySelector('.timer-shaft');
    this.rowsPaneEL = this.shadowRoot!.host.parentNode?.querySelector('.rows-pane');
    this.favoriteChartListEL = this.shadowRoot!.host.parentNode?.querySelector('#favorite-chart-list');
    const height = this.canvas?.clientHeight || 0;
    // 点击cpu usage部分，切换折叠展开
    this.usageEL?.addEventListener('click', (e) => {
      if (this._rangeRuler && this.sportRuler && this._cpuUsageCount.length) {
        // 计算需要被收起来的高度：总高度75-（总高度/cpu数量）* 2
        this._usageFoldHeight = this.usageExpandHeight - (this.usageExpandHeight / this._rangeRuler.cpuCountData!) * 2;
        this.canvas!.width = this.canvas!.clientWidth || 0;
        if (this._checkExpand) {
          sessionStorage.setItem('expand', String(this._checkExpand));
          sessionStorage.setItem('foldHeight', String(this._usageFoldHeight));
          this.usageEL!.style.height = '100px';
          this.usageEL!.style.lineHeight = '100px';
          this.timerShaftEL!.style.height = `${height + 2}px`;
          this.canvas!.style.height = `${height}px`;
          this.canvas!.height = height;
          this._rangeRuler.frame.height = 75;
          this.sportRuler.frame.y = 100;
          this.render();
          this._checkExpand = false;
          this.favoriteChartListEL?.refreshFavoriteCanvas(); //刷新收藏泳道画布高度
        } else {
          sessionStorage.setItem('expand', String(this._checkExpand));
          sessionStorage.setItem('foldHeight', String(this._usageFoldHeight));
          this.usageEL!.style.height = `${100 - this._usageFoldHeight}px`;
          this.usageEL!.style.lineHeight = `${100 - this._usageFoldHeight}px`;
          this.timerShaftEL!.style.height = `${height - this._usageFoldHeight + 2}px`;
          this.canvas!.style.height = `${height - this._usageFoldHeight}px`;
          this.canvas!.height = height - this._usageFoldHeight;
          this._rangeRuler.frame.height = 75 - this._usageFoldHeight;
          this.sportRuler.frame.y = 100 - this._usageFoldHeight;
          this.render();
          this._checkExpand = true;
          this.favoriteChartListEL?.refreshFavoriteCanvas(); //刷新收藏泳道画布高度
        }
      }
    });
  }

  getRangeRuler(): RangeRuler | undefined {
    return this._rangeRuler;
  }

  connectedCallback(): RangeRuler | undefined {
    if (this.canvas) {
      if (this.isOffScreen) {
        // @ts-ignore
        this.offscreen = this.canvas.transferControlToOffscreen();
        return;
      } else {
        this.ctx = this.canvas?.getContext('2d', { alpha: true });
      }
    }
    if (this.timeTotalEL) {
      this.timeTotalEL.textContent = ns2s(this._totalNS);
    }
    if (this.timeOffsetEL && this._rangeRuler) {
      this.timeOffsetEL.textContent = ns2UnitS(this._startNS, this._rangeRuler.getScale());
    }
    const width = this.canvas?.clientWidth || 0;
    const height = this.canvas?.clientHeight || 0;
    this.setTimeRuler(width);
    this.setSportRuler(width, height);
    this.setRangeRuler(width);
  }

  private setTimeRuler(width: number): void {
    if (!this.timeRuler) {
      this.timeRuler = new TimeRuler(this, new Rect(0, 0, width, 20), this._totalNS);
    }
    this.timeRuler.frame.width = width;
  }

  private setSportRuler(width: number, height: number): void {
    if (!this._sportRuler) {
      this._sportRuler = new SportRuler(
        this,
        new Rect(0, 100, width, height - 100),
        (hoverFlag, selectFlag) => {
          this.flagChangeHandler?.(hoverFlag, selectFlag);
        },
        (flag) => {
          this.flagClickHandler?.(flag);
        },
        (slicetime) => {
          this.rangeClickHandler?.(slicetime);
        }
      );
    }
    this._sportRuler.frame.width = width;
  }

  private setRangeRuler(width: number): void {
    if (!this._rangeRuler) {
      this._rangeRuler = new RangeRuler(
        this,
        new Rect(0, 25, width, 75 - this._usageFoldHeight),
        {
          slicesTime: {
            startTime: null,
            endTime: null,
            color: null,
          },
          scale: 0,
          startX: 0,
          endX: this.canvas?.clientWidth || 0,
          startNS: 0,
          endNS: this.totalNS,
          totalNS: this.totalNS,
          refresh: true,
          xs: [],
          xsTxt: [],
        },
        (a) => {
          if (a.startNS >= 0 && a.endNS >= 0) {
            if (this._sportRuler) {
              this._sportRuler.range = a;
            }
            if (this.timeOffsetEL && this._rangeRuler) {
              this.timeOffsetEL.textContent = ns2UnitS(a.startNS, this._rangeRuler.getScale());
            }
            if (this.loadComplete) {
              this.rangeChangeHandler?.(a);
            }
          }
        }
      );
    }
    this._rangeRuler.frame.width = width;
  }

  setRangeNS(startNS: number, endNS: number): void {
    info('set startNS values :' + startNS + 'endNS values : ' + endNS);
    this._rangeRuler?.setRangeNS(startNS, endNS);
  }

  getRange(): TimeRange | undefined {
    return this._rangeRuler?.getRange();
  }

  updateWidth(width: number): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas!.width = width - (this.totalEL?.clientWidth || 0);
    this.canvas!.height = this.shadowRoot!.host.clientHeight || 0;
    let oldWidth = this.canvas!.width;
    let oldHeight = this.canvas!.height;
    this.canvas!.width = Math.ceil(oldWidth * this.dpr);
    this.canvas!.height = Math.ceil(oldHeight * this.dpr);
    this.canvas!.style.width = oldWidth + 'px';
    this.canvas!.style.height = oldHeight + 'px';
    this.ctx?.scale(this.dpr, this.dpr);
    this.ctx?.translate(0, 0);
    this._rangeRuler!.frame.width = oldWidth;
    this._sportRuler!.frame.width = oldWidth;
    this.timeRuler!.frame.width = oldWidth;
    this._rangeRuler?.fillX();
    this.render();
  }

  documentOnMouseDown = (ev: MouseEvent): void => {
    // @ts-ignore
    if ((window as unknown).isSheetMove) {
      return;
    }
    this._rangeRuler?.mouseDown(ev);
  };

  documentOnMouseUp = (ev: MouseEvent): void => {
    // @ts-ignore
    if ((window as unknown).isSheetMove) {
      return;
    }
    this._rangeRuler?.mouseUp(ev);
    this.sportRuler?.mouseUp(ev);
  };

  documentOnMouseMove = (ev: MouseEvent, trace: SpSystemTrace): void => {
    trace.style.cursor = 'default';
    let x = ev.offsetX - (this.canvas?.offsetLeft || 0); // 鼠标的x轴坐标
    let y = ev.offsetY; // 鼠标的y轴坐标
    let findSlicestime = this.sportRuler?.findSlicesTime(x, y); // 查找帽子
    if (!findSlicestime) {
      // 如果在该位置没有找到一个“帽子”，则可以显示一个旗子。
      this.sportRuler?.showHoverFlag();
      this._rangeRuler?.mouseMove(ev, trace);
      if (this.sportRuler?.edgeDetection(ev)) {
        this.sportRuler?.mouseMove(ev);
      } else {
        this.sportRuler?.mouseOut(ev);
      }
    } else {
      this.sportRuler?.clearHoverFlag();
      this.sportRuler?.modifyFlagList(null); //重新绘制旗子，清除hover flag
    }
  };

  documentOnMouseOut = (ev: MouseEvent): void => {
    this._rangeRuler?.mouseOut(ev);
    this.sportRuler?.mouseOut(ev);
  };

  documentOnKeyPress = (ev: KeyboardEvent, currentSlicesTime?: CurrentSlicesTime): void => {
    // @ts-ignore
    if ((window as unknown).flagInputFocus) {
      return;
    }
    this._rangeRuler?.keyPress(ev, currentSlicesTime);
    this.sportRuler?.clearHoverFlag();
  };

  documentOnKeyUp = (ev: KeyboardEvent): void => {
    // @ts-ignore
    if ((window as unknown).flagInputFocus) {
      return;
    }
    this._rangeRuler?.keyUp(ev);
  };

  disconnectedCallback(): void {}

  firstRender = true;

  lineColor(): string {
    return window.getComputedStyle(this.canvas!, null).getPropertyValue('color');
  }

  render(): void {
    this.dpr = window.devicePixelRatio || 1;
    if (this.ctx) {
      this.ctx.fillStyle = 'transparent';
      this.ctx?.fillRect(0, 0, this.canvas?.width || 0, this.canvas?.height || 0);
      this.timeRuler?.draw();
      this._rangeRuler?.draw();
      this._sportRuler?.draw();
    } else {
      procedurePool.submitWithName(
        'timeline',
        'timeline',
        {
          offscreen: this.must ? this.offscreen : undefined, //是否离屏
          dpr: this.dpr, //屏幕dpr值
          hoverX: this.hoverX,
          hoverY: this.hoverY,
          canvasWidth: this.canvasWidth,
          canvasHeight: this.canvasHeight,
          keyPressCode: null,
          keyUpCode: null,
          lineColor: '#dadada',
          startNS: this.startNS,
          endNS: this.endNS,
          totalNS: this.totalNS,
          frame: this.frame,
        },
        this.must ? this.offscreen : undefined,
        (res: unknown) => {
          this.must = false;
        }
      );
    }
  }

  modifyFlagList(flag: Flag | null | undefined): void {
    this._sportRuler?.modifyFlagList(flag);
  }

  modifySlicesList(slicestime: SlicesTime | null | undefined): void {
    this._sportRuler?.modifySicesTimeList(slicestime);
  }
  cancelPressFrame(): void {
    this._rangeRuler?.cancelPressFrame();
  }

  cancelUpFrame(): void {
    this._rangeRuler?.cancelUpFrame();
  }

  stopWASD(ev: unknown): void {
    // @ts-ignore
    this._rangeRuler?.keyUp(ev);
  }

  drawTriangle(time: number, type: string): unknown {
    return this._sportRuler?.drawTriangle(time, type);
  }

  removeTriangle(type: string): void {
    this._sportRuler?.removeTriangle(type);
  }

  setSlicesMark(
    startTime: null | number = null,
    endTime: null | number = null,
    shiftKey: null | boolean = false
  ): SlicesTime | null | undefined {
    let sliceTime = this._sportRuler?.setSlicesMark(startTime, endTime, shiftKey);
    if (sliceTime && sliceTime !== undefined) {
      this.traceSheetEL?.displayCurrent(sliceTime); // 给当前pane准备数据

      // 取最新创建的那个selection对象
      let selection = this.selectionList[this.selectionList.length - 1];
      if (selection) {
        selection.isCurrentPane = true; // 设置当前面板为可以显示的状态
        //把刚刚创建的slicetime和selection对象关联起来，以便后面再次选中“跑道”的时候显示对应的面板。
        this.selectionMap.set(sliceTime.id, selection);
        this.traceSheetEL?.rangeSelect(selection); // 显示选中区域对应的面板
      }
    }
    return sliceTime;
  }

  displayCollect(showCollect: boolean): void {
    if (showCollect) {
      this.collecBtn!.style.display = 'flex';
    } else {
      this.collecBtn!.style.display = 'none';
    }
  }

  initHtml(): string {
    return TimerShaftElementHtml;
  }
}
export class SpQuerySQL extends BaseElement {
    private queryTableEl: LitTable | undefined;
    private notSupportList: Array<string> | undefined = [];
    private querySize: HTMLElement | undefined;
    private keyList: Array<string> | undefined;
    private selector: HTMLTextAreaElement | undefined;
    private isSupportSql: boolean = true;
    private response: HTMLDivElement | undefined;
    private statDataArray: unknown[] = [];
    private sliceData: unknown[] = [];
    private querySqlErrorText: string = '';
    private progressLoad: LitProgressBar | undefined;
    private pagination: PaginationBox | undefined;
    private sqlListDiv: HTMLDivElement | undefined;
  
    initElements(): void {
      this.progressLoad = this.shadowRoot?.querySelector('.load-query-sql') as LitProgressBar;
      this.selector = this.shadowRoot?.querySelector('.sql-select') as HTMLTextAreaElement;
      this.queryTableEl = this.shadowRoot?.querySelector('lit-table') as LitTable;
      this.queryTableEl.setAttribute('data-query-scene', '');
      this.querySize = this.shadowRoot?.querySelector('.query_size') as HTMLElement;
      this.response = this.shadowRoot?.querySelector('#dataResult') as HTMLDivElement;
      this.pagination = this.shadowRoot?.querySelector('.pagination-box') as PaginationBox;
      this.notSupportList?.push('insert', 'delete', 'update', 'drop', 'alter', 'truncate', 'create');
      this.sqlListDiv = this.shadowRoot?.querySelector('#sqlList') as HTMLDivElement;
      let htmlDivElement = this.queryTableEl.shadowRoot?.querySelector('.table') as HTMLDivElement;
      htmlDivElement.style.overflowX = 'scroll';
      window.addEventListener('resize', () => {
        this.freshTableHeadResizeStyle();
      });
      let copyButtonEl = this.shadowRoot?.querySelector('#copy-button') as HTMLButtonElement;
      copyButtonEl.addEventListener('click', () => {
        this.copyTableData();
      });
      let closeButtonEl = this.shadowRoot?.querySelector('#close-button') as HTMLButtonElement;
      closeButtonEl.addEventListener('click', () => {
        this.pagination!.style.display = 'none';
        this.querySize!.textContent = 'Query result - 0 counts.';
        this.queryTableEl!.dataSource = [];
        this.response!.innerHTML = '';
      });
      this.initCommonList();
    }
  
    private initCommonList(): void {
      let commonSqlList = getAllSql();
      if (commonSqlList.length > 0) {
        for (let i = 0; i < commonSqlList.length; i++) {
          let commonSqlDiv = document.createElement('div');
          commonSqlDiv.className = 'sql-item';
          let sql = document.createElement('div');
          sql.className = 'sql';
          sql.textContent = commonSqlList[i].sql;
          let runButton = document.createElement('lit-icon');
          runButton.className = 'runButton';
          runButton.title = commonSqlList[i].title;
          runButton.setAttribute('size', '20');
          runButton.setAttribute('name', 'run-sql');
          commonSqlDiv.appendChild(sql);
          commonSqlDiv.appendChild(runButton);
          this.sqlListDiv?.append(commonSqlDiv);
        }
      }
    }
  
    private freshTableHeadResizeStyle(): void {
      let th = this.queryTableEl!.shadowRoot?.querySelector<HTMLDivElement>('.th');
      if (th) {
        let td = th.querySelectorAll<HTMLDivElement>('.td');
        let firstChild = this.queryTableEl!.shadowRoot?.querySelector<HTMLDivElement>('.body')!.firstElementChild;
        if (firstChild) {
          let bodyList = firstChild.querySelectorAll<HTMLDivElement>('.td');
          for (let index = 0; index < bodyList.length; index++) {
            td[index].style.width = `${bodyList[index].offsetWidth}px`;
            td[index].style.overflow = 'hidden';
          }
        }
      }
      let tableHeadStyle: HTMLDivElement | undefined | null = this.queryTableEl?.shadowRoot?.querySelector(
        'div.th'
      ) as HTMLDivElement;
      if (tableHeadStyle && tableHeadStyle.hasChildNodes()) {
        for (let index = 0; index < tableHeadStyle.children.length; index++) {
          // @ts-ignore
          tableHeadStyle.children[index].style.gridArea = null;
        }
      }
      this.queryTableEl!.style.height = '100%';
    }
  
    private async copyTableData(): Promise<void> {
      let copyResult = '';
      for (let keyListKey of this.keyList!) {
        copyResult += `${keyListKey}\t`;
      }
      copyResult += '\n';
      let copyData: unknown[];
      if (this.statDataArray.length > maxPageSize) {
        copyData = this.sliceData;
      } else {
        copyData = this.statDataArray;
      }
      for (const value of copyData) {
        this.keyList?.forEach((key) => {
          // @ts-ignore
          copyResult += `${value[key]}\t`;
        });
        copyResult += '\n';
      }
      await navigator.clipboard.writeText(copyResult);
    }
  
    selectEventListener = (event: KeyboardEvent): void => {
      let enterKey = 13;
      if (event.ctrlKey && event.keyCode === enterKey) {
        SpStatisticsHttpUtil.addOrdinaryVisitAction({
          event: 'query',
          action: 'query',
        });
        this.statDataArray = [];
        this.keyList = [];
        this.response!.innerHTML = '';
        this.queryTableEl!.innerHTML = '';
        this.pagination!.style.display = 'none';
        if (this.isSupportSql) {
          this.executeSql(this.selector!.value);
        } else {
          this.querySize!.textContent = this.querySqlErrorText;
          this.queryTableEl!.dataSource = [];
          this.response!.innerHTML = '';
          return;
        }
      }
    };
  
    private executeSql(sql: string): void {
      this.progressLoad!.loading = true;
      if (this.querySize) {
        this.querySize!.title = `${sql}`;
      }
      queryCustomizeSelect(sql).then((resultList): void => {
        if (resultList && resultList.length > 0) {
          this.statDataArray = resultList;
          //@ts-ignore
          this.keyList = Object.keys(resultList[0]);
          this.querySize!.textContent = `Query result - ${this.statDataArray.length} counts.` + `(${sql})`;
          this.initDataElement();
          this.response!.appendChild(this.queryTableEl!);
          this.setPageNationTableEl();
          setTimeout(() => {
            if (this.parentElement?.clientHeight !== 0) {
              this.queryTableEl!.style.height = '100%';
              this.queryTableEl!.reMeauseHeight();
            }
          }, 300);
        } else {
          this.querySize!.textContent = `Query result - ${this.statDataArray.length} counts.` + `(${sql})`;
          this.progressLoad!.loading = false;
        }
      });
    }
  
    private setPageNationTableEl(): void {
      let timeOutTs: number = 200;
      let indexNumber = 1;
      setTimeout(() => {
        let total = this.statDataArray.length;
        if (total > maxPageSize) {
          this.pagination!.style.display = 'block';
          this.pagination!.style.opacity = '1';
          const option = {
            current: 1,
            total: total,
            pageSize: pageSize,
            change: (num: number): void => {
              this.sliceData = this.statDataArray!.slice((num - indexNumber) * pageSize, num * pageSize);
              this.queryTableEl!.recycleDataSource = this.sliceData;
            },
          };
          new PageNation(this.pagination, option);
        } else {
          this.pagination!.style.opacity = '0';
          this.queryTableEl!.recycleDataSource = this.statDataArray;
        }
        this.freshTableHeadResizeStyle();
        this.progressLoad!.loading = false;
      }, timeOutTs);
    }

    import { type SpSystemTrace } from '../SpSystemTrace';
import { TraceRow } from '../trace/base/TraceRow';
import { renders } from '../../database/ui-worker/ProcedureWorker';
import { type EmptyRender } from '../../database/ui-worker/cpu/ProcedureWorkerCPU';
import { type FreqExtendRender, CpuFreqExtendStruct } from '../../database/ui-worker/ProcedureWorkerFreqExtend';
import { type BinderRender, BinderStruct } from '../../database/ui-worker/procedureWorkerBinder';
import { type BaseStruct } from '../../bean/BaseStruct';
import { type AllStatesRender, AllstatesStruct } from '../../database/ui-worker/ProcedureWorkerAllStates';
import { StateGroup } from '../../bean/StateModle';
import { queryAllFuncNames } from '../../database/sql/Func.sql';
import { Utils } from '../trace/base/Utils';
import { TabPaneFreqUsage } from "../trace/sheet/frequsage/TabPaneFreqUsage";
const UNIT_HEIGHT: number = 20;
const MS_TO_US: number = 1000000;
const MIN_HEIGHT: number = 2;
export class SpSegmentationChart {
  static trace: SpSystemTrace;
  static cpuRow: TraceRow<CpuFreqExtendStruct> | undefined;
  static GpuRow: TraceRow<CpuFreqExtendStruct> | undefined;
  static binderRow: TraceRow<BinderStruct> | undefined;
  static schedRow: TraceRow<CpuFreqExtendStruct> | undefined;
  static freqInfoMapData = new Map<number, Map<number, number>>();
  static hoverLine: Array<HeightLine> = [];
  static tabHoverObj: { key: string, cycle: number };
  private rowFolder!: TraceRow<BaseStruct>;
  static chartData: Array<Object> = [];
  static statesRow: TraceRow<AllstatesStruct> | undefined;
  // 数据切割联动
  static setChartData(type: string, data: Array<FreqChartDataStruct>): void {
    SpSegmentationChart.tabHoverObj = { key: '', cycle: -1 };
    SpSegmentationChart.trace.traceSheetEL!.systemLogFlag = undefined;
    if (type === 'CPU-FREQ') {
      setCpuData(data);
    } else if (type === 'GPU-FREQ') {
      setGpuData(data);
    } else {
      setSchedData(data);
    }
    SpSegmentationChart.trace.refreshCanvas(false);
  }

  // state泳道联动
  static setStateChartData(data: Array<StateGroup>) {
    SpSegmentationChart.tabHoverObj = { key: '', cycle: -1 };
    SpSegmentationChart.trace.traceSheetEL!.systemLogFlag = undefined;
    let stateChartData = new Array();
    stateChartData = data.map(v => {
      return {
        dur: v.dur,
        chartDur: v.chartDur,
        pid: v.pid,
        tid: v.tid,
        end_ts: v.startTs! + v.chartDur!,
        id: v.id,
        name: 'all-state',
        startTime: v.startTs,
        start_ts: v.startTs,
        state: v.state,
        type: v.type,
        cycle: v.cycle,
      };
    });
    SpSegmentationChart.statesRow!.dataList = [];
    SpSegmentationChart.statesRow!.dataListCache = [];
    SpSegmentationChart.statesRow!.isComplete = false;
    // @ts-ignore
    SpSegmentationChart.statesRow!.supplier = (): Promise<Array<ThreadStruct>> =>
      new Promise<Array<AllstatesStruct>>((resolve) => resolve(stateChartData));
    SpSegmentationChart.trace.refreshCanvas(false);
  };

  // binder联动调用
  static setBinderChartData(data: Array<Array<FreqChartDataStruct>>): void {
    SpSegmentationChart.tabHoverObj = { key: '', cycle: -1 };
    SpSegmentationChart.trace.traceSheetEL!.systemLogFlag = undefined;
    BinderStruct.maxHeight = 0;
    SpSegmentationChart.binderRow!.dataList = [];
    SpSegmentationChart.binderRow!.dataListCache = [];
    SpSegmentationChart.binderRow!.isComplete = false;
    if (data.length === 0) {
      SpSegmentationChart.binderRow!.style.height = `40px`;
      SpSegmentationChart.binderRow!.funcMaxHeight = 40;
      // @ts-ignore
      SpSegmentationChart.binderRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
        new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    } else {
      let binderList: Array<FreqChartDataStruct> = [];
      let chartData: Array<FreqChartDataStruct> = [];
      setBinderData(data, binderList);
      chartData = binderList.map((v: FreqChartDataStruct) => {
        return {
          cpu:
            v.name === 'binder transaction'
              ? 0
              : v.name === 'binder transaction async'
                ? 1
                : v.name === 'binder reply'
                  ? MS_TO_US
                  : 3,
          startNS: v.startNS,
          dur: v.dur,
          name: `${v.name}`,
          value: v.value,
          depth: v.depth,
          cycle: v.cycle,
        };
      });
      // @ts-ignore
      SpSegmentationChart.binderRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
        new Promise<Array<FreqChartDataStruct>>((resolve) => resolve(chartData));
      SpSegmentationChart.binderRow!.style.height = `${BinderStruct.maxHeight > MIN_HEIGHT ? BinderStruct.maxHeight * UNIT_HEIGHT + UNIT_HEIGHT : 40}px`;
      SpSegmentationChart.binderRow!.funcMaxHeight = BinderStruct.maxHeight > MIN_HEIGHT ? BinderStruct.maxHeight * UNIT_HEIGHT + UNIT_HEIGHT : 40;
    }
    TraceRow.range!.refresh = true;
    SpSegmentationChart.binderRow!.needRefresh = true;
    SpSegmentationChart.binderRow!.draw(false);
    if (SpSegmentationChart.binderRow!.collect) {
      window.publish(window.SmartEvent.UI.RowHeightChange, {
        expand: SpSegmentationChart.binderRow!.funcExpand,
        value: SpSegmentationChart.binderRow!.funcMaxHeight - 40,
      });
    }
    SpSegmentationChart.trace.favoriteChartListEL?.scrollTo(0, 0);
    SpSegmentationChart.trace.refreshCanvas(false);
  }
  // 悬浮联动
  static tabHover(type: string, tableIsHover: boolean = false, cycle: number = -1): void {
    if (tableIsHover) {
      if (SpSegmentationChart.tabHoverObj.cycle === cycle && SpSegmentationChart.tabHoverObj.key === type) {
        SpSegmentationChart.tabHoverObj = { cycle: -1, key: '' };
      } else {
        SpSegmentationChart.tabHoverObj = { cycle, key: type };
      }
    } else {
      SpSegmentationChart.tabHoverObj = { cycle: -1, key: '' };
    }

    SpSegmentationChart.trace.refreshCanvas(false);
  }
  constructor(trace: SpSystemTrace) {
    SpSegmentationChart.trace = trace;
  }
  async init() {
    if (Utils.getInstance().getCallStatckMap().size > 0) {
      await this.initFolder();
      await this.initCpuFreq();
      await this.initGpuTrace();
      await this.initSchedTrace();
      await this.initBinderTrace();
      await this.initAllStates();
    } else {
      return;
    }
  }
  async initFolder() {
    let row = TraceRow.skeleton();
    row.rowId = 'segmentation';
    row.index = 0;
    row.rowType = TraceRow.ROW_TYPE_SPSEGNENTATION;
    row.rowParentId = '';
    row.folder = true;
    row.style.height = '40px';
    row.name = 'Segmentation';
    row.supplier = (): Promise<Array<BaseStruct>> => new Promise<Array<BaseStruct>>((resolve) => resolve([]));
    row.onThreadHandler = (useCache): void => {
      row.canvasSave(SpSegmentationChart.trace.canvasPanelCtx!);
      if (row.expansion) {
        SpSegmentationChart.trace.canvasPanelCtx?.clearRect(0, 0, row.frame.width, row.frame.height);
      } else {
        (renders['empty'] as EmptyRender).renderMainThread(
          {
            context: SpSegmentationChart.trace.canvasPanelCtx,
            useCache: useCache,
            type: '',
          },
          row
        );
      }
      row.canvasRestore(SpSegmentationChart.trace.canvasPanelCtx!);
    };
    this.rowFolder = row;
    SpSegmentationChart.trace.rowsEL?.appendChild(row);
  }
  async initCpuFreq() {
    // json文件泳道
    SpSegmentationChart.cpuRow = TraceRow.skeleton<CpuFreqExtendStruct>();
    SpSegmentationChart.cpuRow.rowId = 'cpu-freq';
    SpSegmentationChart.cpuRow.rowType = TraceRow.ROW_TYPE_CPU_COMPUTILITY;
    SpSegmentationChart.cpuRow.rowParentId = '';
    SpSegmentationChart.cpuRow.style.height = '40px';
    SpSegmentationChart.cpuRow.name = 'Cpu Computility';
    SpSegmentationChart.cpuRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.cpuRow.addRowCheckFilePop();
    SpSegmentationChart.cpuRow.rowSetting = 'checkFile';
    // 拿到了用户传递的数据
    SpSegmentationChart.cpuRow.onRowCheckFileChangeHandler = (): void => {
      SpSegmentationChart.freqInfoMapData = new Map<number, Map<number, number>>();
      if (sessionStorage.getItem('freqInfoData')) {
        // @ts-ignore
        let chartData = JSON.parse(JSON.parse(sessionStorage.getItem('freqInfoData')));
        let mapData = new Map<number, number>();
        // @ts-ignore
        chartData.map((v) => {
          for (let key in v.freqInfo) {
            mapData.set(Number(key), Number(v.freqInfo[key]));
          }
          SpSegmentationChart.freqInfoMapData.set(v.cpuId, mapData);
          mapData = new Map();
        });
        TabPaneFreqUsage.refresh();
      }
    };
    SpSegmentationChart.cpuRow.focusHandler = (ev): void => {
      SpSegmentationChart.trace?.displayTip(
        SpSegmentationChart.cpuRow!,
        CpuFreqExtendStruct.hoverStruct,
        `<span>${CpuFreqExtendStruct.hoverStruct === undefined ? 0 : CpuFreqExtendStruct.hoverStruct.value!
        }</span>`
      );
    };
    SpSegmentationChart.cpuRow.findHoverStruct = (): void => {
      CpuFreqExtendStruct.hoverStruct = SpSegmentationChart.cpuRow!.getHoverStruct();
    };
    // @ts-ignore
    SpSegmentationChart.cpuRow.supplier = (): Promise<Array<freqChartDataStruct>> =>
      new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    SpSegmentationChart.cpuRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.cpuRow!.currentContext) {
        context = SpSegmentationChart.cpuRow!.currentContext;
      } else {
        context = SpSegmentationChart.cpuRow!.collect
          ? SpSegmentationChart.trace.canvasFavoritePanelCtx!
          : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.cpuRow!.canvasSave(context);
      (renders['freq-extend'] as FreqExtendRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: 'CPU-FREQ',
        },
        SpSegmentationChart.cpuRow!
      );
      SpSegmentationChart.cpuRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.cpuRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.cpuRow);
  }
  async initGpuTrace() {
    SpSegmentationChart.GpuRow = TraceRow.skeleton<CpuFreqExtendStruct>();
    SpSegmentationChart.GpuRow.rowId = 'gpurow';
    SpSegmentationChart.GpuRow.rowType = TraceRow.ROW_TYPE_GPU_COMPUTILITY;
    SpSegmentationChart.GpuRow.rowParentId = '';
    SpSegmentationChart.GpuRow.style.height = '40px';
    SpSegmentationChart.GpuRow.name = 'Gpu Computility';
    SpSegmentationChart.GpuRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.GpuRow.selectChangeHandler = SpSegmentationChart.trace.selectChangeHandler;
    // @ts-ignore
    SpSegmentationChart.GpuRow.supplier = (): Promise<Array<freqChartDataStruct>> =>
      new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    SpSegmentationChart.GpuRow.focusHandler = (ev): void => {
      SpSegmentationChart.trace?.displayTip(
        SpSegmentationChart.GpuRow!,
        CpuFreqExtendStruct.hoverStruct,
        `<span>${CpuFreqExtendStruct.hoverStruct === undefined ? 0 : CpuFreqExtendStruct.hoverStruct.value!
        }</span>`
      );
    };
    SpSegmentationChart.GpuRow.findHoverStruct = (): void => {
      CpuFreqExtendStruct.hoverStruct = SpSegmentationChart.GpuRow!.getHoverStruct();
    };
    SpSegmentationChart.GpuRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.GpuRow!.currentContext) {
        context = SpSegmentationChart.GpuRow!.currentContext;
      } else {
        context = SpSegmentationChart.GpuRow!.collect
          ? SpSegmentationChart.trace.canvasFavoritePanelCtx!
          : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.GpuRow!.canvasSave(context);
      (renders['freq-extend'] as FreqExtendRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: 'GPU-FREQ',
        },
        SpSegmentationChart.GpuRow!
      );
      SpSegmentationChart.GpuRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.GpuRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.GpuRow);
  }
  async initSchedTrace() {
    SpSegmentationChart.schedRow = TraceRow.skeleton<CpuFreqExtendStruct>();
    SpSegmentationChart.schedRow.rowId = 'sched_switch Count';
    SpSegmentationChart.schedRow.rowType = TraceRow.ROW_TYPE_SCHED_SWITCH;
    SpSegmentationChart.schedRow.rowParentId = '';
    SpSegmentationChart.schedRow.style.height = '40px';
    SpSegmentationChart.schedRow.name = 'Sched_switch Count';
    SpSegmentationChart.schedRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.schedRow.selectChangeHandler = SpSegmentationChart.trace.selectChangeHandler;
    SpSegmentationChart.schedRow.focusHandler = (ev): void => {
      SpSegmentationChart.trace?.displayTip(
        SpSegmentationChart.schedRow!,
        CpuFreqExtendStruct.hoverStruct,
        `<span>${CpuFreqExtendStruct.hoverStruct?.value!}</span>`
      );
    };
    SpSegmentationChart.schedRow.findHoverStruct = (): void => {
      CpuFreqExtendStruct.hoverStruct = SpSegmentationChart.schedRow!.getHoverStruct();
    };
    // @ts-ignore
    SpSegmentationChart.schedRow.supplier = (): Promise<Array<freqChartDataStruct>> =>
      new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    SpSegmentationChart.schedRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.schedRow!.currentContext) {
        context = SpSegmentationChart.schedRow!.currentContext;
      } else {
        context = SpSegmentationChart.schedRow!.collect
          ? SpSegmentationChart.trace.canvasFavoritePanelCtx!
          : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.schedRow!.canvasSave(context);
      (renders['freq-extend'] as FreqExtendRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: 'SCHED-SWITCH',
        },
        SpSegmentationChart.schedRow!
      );
      SpSegmentationChart.schedRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.schedRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.schedRow);
  }

  async initAllStates() {
    SpSegmentationChart.statesRow = TraceRow.skeleton<AllstatesStruct>();
    SpSegmentationChart.statesRow.rowId = `statesrow`;
    SpSegmentationChart.statesRow.rowType = TraceRow.ROW_TYPE_THREAD;
    SpSegmentationChart.statesRow.rowParentId = '';
    SpSegmentationChart.statesRow.style.height = '30px';
    SpSegmentationChart.statesRow.name = `All States`;
    SpSegmentationChart.statesRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.statesRow.selectChangeHandler = SpSegmentationChart.trace.selectChangeHandler;
    // @ts-ignore
    SpSegmentationChart.statesRow.supplier = (): Promise<Array<freqChartDataStruct>> =>
      new Promise<Array<FreqChartDataStruct>>((resolve) => resolve([]));
    SpSegmentationChart.statesRow.onThreadHandler = (useCache) => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.statesRow!.currentContext) {
        context = SpSegmentationChart.statesRow!.currentContext;
      } else {
        context = SpSegmentationChart.statesRow!.collect ? SpSegmentationChart.trace.canvasFavoritePanelCtx! : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.statesRow!.canvasSave(context);
      (renders.stateCut as AllStatesRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: ``,
          translateY: SpSegmentationChart.statesRow!.translateY,
        },
        SpSegmentationChart.statesRow!
      );
      SpSegmentationChart.statesRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.statesRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.statesRow);
  }

  async initBinderTrace() {
    SpSegmentationChart.binderRow = TraceRow.skeleton<BinderStruct>();
    SpSegmentationChart.binderRow.rowId = 'binderrow';
    SpSegmentationChart.binderRow.rowType = TraceRow.ROW_TYPE_BINDER_COUNT;
    SpSegmentationChart.binderRow.enableCollapseChart(40, SpSegmentationChart.trace);
    SpSegmentationChart.binderRow.rowParentId = '';
    SpSegmentationChart.binderRow.name = 'Binder Count';
    SpSegmentationChart.binderRow.style.height = '40px';
    SpSegmentationChart.binderRow.favoriteChangeHandler = SpSegmentationChart.trace.favoriteChangeHandler;
    SpSegmentationChart.binderRow.selectChangeHandler = SpSegmentationChart.trace.selectChangeHandler;
    SpSegmentationChart.binderRow.findHoverStruct = () => {
      BinderStruct.hoverCpuFreqStruct = SpSegmentationChart.binderRow!.dataListCache.find((v: BinderStruct) => {
        if (SpSegmentationChart.binderRow!.isHover) {
          if (v.frame!.x < SpSegmentationChart.binderRow!.hoverX + 1 &&
            v.frame!.x + v.frame!.width > SpSegmentationChart.binderRow!.hoverX - 1 &&
            (BinderStruct.maxHeight * 20 - v.depth * 20 + 20) < SpSegmentationChart.binderRow!.hoverY &&
            BinderStruct.maxHeight * 20 - v.depth * 20 + v.value * 20 + 20 > SpSegmentationChart.binderRow!.hoverY) {
            return v;
          }
        }
      })
    };
    SpSegmentationChart.binderRow.focusHandler = (ev): void => {
      SpSegmentationChart.trace!.displayTip(
        SpSegmentationChart.binderRow!,
        BinderStruct.hoverCpuFreqStruct,
        `<span style='font-weight: bold;'>Cycle: ${BinderStruct.hoverCpuFreqStruct ? BinderStruct.hoverCpuFreqStruct.cycle : 0
        }</span><br>
                <span style='font-weight: bold;'>Name: ${BinderStruct.hoverCpuFreqStruct ? BinderStruct.hoverCpuFreqStruct.name : ''
        }</span><br>
                <span style='font-weight: bold;'>Count: ${BinderStruct.hoverCpuFreqStruct ? BinderStruct.hoverCpuFreqStruct.value : 0
        }</span>`
      );
    };

    SpSegmentationChart.binderRow.supplier = (): Promise<Array<BinderStruct>> =>
      new Promise<Array<BinderStruct>>((resolve) => resolve([]));
    SpSegmentationChart.binderRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (SpSegmentationChart.binderRow!.currentContext) {
        context = SpSegmentationChart.binderRow!.currentContext;
      } else {
        context = SpSegmentationChart.binderRow!.collect
          ? SpSegmentationChart.trace.canvasFavoritePanelCtx!
          : SpSegmentationChart.trace.canvasPanelCtx!;
      }
      SpSegmentationChart.binderRow!.canvasSave(context);
      (renders.binder as BinderRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: 'BINDER',
        },
        SpSegmentationChart.binderRow!
      );
      SpSegmentationChart.binderRow!.canvasRestore(context);
    };
    SpSegmentationChart.trace.rowsEL?.appendChild(SpSegmentationChart.binderRow);
    this.rowFolder!.addChildTraceRow(SpSegmentationChart.binderRow);
  }
}
class FreqChartDataStruct {
  colorIndex?: number = 0;
  dur: number = 0;
  value: number = 0;
  startNS: number = 0;
  cycle: number = 0;
  depth?: number = 1;
  name?: string = '';
}

function setCpuData(data: Array<FreqChartDataStruct>) {
  let currentMaxValue = 0;
  data.map((v: FreqChartDataStruct) => {
    if (v.value > currentMaxValue) {
      currentMaxValue = v.value;
    }
  });
  CpuFreqExtendStruct.hoverType = 'CPU-FREQ';
  CpuFreqExtendStruct.cpuMaxValue = currentMaxValue;
  SpSegmentationChart.cpuRow!.dataList = [];
  SpSegmentationChart.cpuRow!.dataListCache = [];
  SpSegmentationChart.cpuRow!.isComplete = false;
  // @ts-ignore
  SpSegmentationChart.cpuRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
    new Promise<Array<FreqChartDataStruct>>((resolve) => resolve(data));
}
function setGpuData(data: Array<FreqChartDataStruct>): void {
  let currentMaxValue = 0;
  data.map((v: FreqChartDataStruct) => {
    if (v.value && v.value > currentMaxValue!) {
      currentMaxValue = v.value;
    }
  });
  CpuFreqExtendStruct.hoverType = 'GPU-FREQ';
  CpuFreqExtendStruct.gpuMaxValue = currentMaxValue;
  SpSegmentationChart.GpuRow!.dataList = [];
  SpSegmentationChart.GpuRow!.dataListCache = [];
  SpSegmentationChart.GpuRow!.isComplete = false;
  // @ts-ignore
  SpSegmentationChart.GpuRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
    new Promise<Array<FreqChartDataStruct>>((resolve) => resolve(data));
}
function setSchedData(data: Array<FreqChartDataStruct>): void {
  let currentMaxValue = 0;
  data.map((v: FreqChartDataStruct) => {
    if (v.value && v.value > currentMaxValue!) {
      currentMaxValue = v.value;
    }
  });
  CpuFreqExtendStruct.hoverType = 'SCHED-SWITCH';
  CpuFreqExtendStruct.schedMaxValue = currentMaxValue!;
  SpSegmentationChart.schedRow!.dataList = [];
  SpSegmentationChart.schedRow!.dataListCache = [];
  SpSegmentationChart.schedRow!.isComplete = false;
  // @ts-ignore
  SpSegmentationChart.schedRow!.supplier = (): Promise<Array<FreqChartDataStruct>> =>
    new Promise<Array<FreqChartDataStruct>>((resolve) => resolve(data));
}
function setBinderData(data: Array<Array<FreqChartDataStruct>>, binderList: Array<FreqChartDataStruct>): void {
  data.map((v: Array<FreqChartDataStruct>) => {
    // 统计每一竖列的最大count
    let listCount = 0;
    v.map((t: FreqChartDataStruct) => {
      listCount += t.value;
      if (t.name === 'binder transaction') {
        t.depth = t.value;
      }
      if (t.name === 'binder transaction async') {
        t.depth =
          t.value +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction';
            })[0].value
            : 0);
      }
      if (t.name === 'binder reply') {
        t.depth =
          t.value +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction';
            })[0].value
            : 0) +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction async';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction async';
            })[0].value
            : 0);
      }
      if (t.name === 'binder async rcv') {
        t.depth =
          t.value +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction';
            })[0].value
            : 0) +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder transaction async';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder transaction async';
            })[0].value
            : 0) +
          (v.filter((i: FreqChartDataStruct) => {
            return i.name === 'binder reply';
          }).length > 0
            ? v.filter((i: FreqChartDataStruct) => {
              return i.name === 'binder reply';
            })[0].value
            : 0);
      }
      binderList.push(t);
    });
    BinderStruct.maxHeight =
      BinderStruct.maxHeight > listCount ? BinderStruct.maxHeight : JSON.parse(JSON.stringify(listCount));
    listCount = 0;
  });
}

class HeightLine {
  key: string = '';
  cycle: number = -1;
}
/*
 * Copyright (C) 2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { convertJSON, LogicHandler } from './ProcedureLogicWorkerCommon';

interface SPT {
  title: string;
  count: number;
  wallDuration: number;
  minDuration: number;
  maxDuration: number;
  avgDuration: string;
  children: Array<SPT>;
  state: string;
  pid: number;
  tid: number;
}

export class ProcedureLogicWorkerSPT extends LogicHandler {
  threadSlice: Array<ThreadSlice> = [];
  currentEventId: string = '';

  clearAll(): void {
    this.threadSlice.length = 0;
  }

  handle(data: unknown): void {
    //@ts-ignore
    this.currentEventId = data.id;
    //@ts-ignore
    if (data && data.type) {
      //@ts-ignore
      switch (data.type) {
        case 'spt-init':
          this.sptInit(data);
          break;
        case 'spt-getPTS':
          //@ts-ignore
          this.sptGetPTS(data.params);
          break;
        case 'spt-getSPT':
          //@ts-ignore
          this.sptGetSPT(data.params);
          break;
        case 'spt-getCpuPriority':
          this.sptGetCpuPriority();
          break;
        case 'spt-getCpuPriorityByTime':
          //@ts-ignore
          this.sptGetCpuPriorityByTime(data.params);
          break;
      }
    }
  }
  private sptInit(data: unknown): void {
    //@ts-ignore
    if (data.params.list) {
      //@ts-ignore
      this.threadSlice = convertJSON(data.params.list);
      self.postMessage({
        id: this.currentEventId,
        action: 'spt-init',
        results: [],
      });
    } else {
      this.getThreadState();
    }
  }

  private sptGetPTS(params: { leftNs: number; rightNs: number; cpus: Array<number> }): void {
    self.postMessage({
      id: this.currentEventId,
      action: 'spt-getPTS',
      results: this.getPTSData(params.leftNs, params.rightNs, params.cpus),
    });
  }
  private sptGetSPT(params: { leftNs: number; rightNs: number; cpus: Array<number> }): void {
    self.postMessage({
      id: this.currentEventId,
      action: 'spt-getSPT',
      results: this.getSPTData(params.leftNs, params.rightNs, params.cpus),
    });
  }
  private sptGetCpuPriority(): void {
    self.postMessage({
      id: this.currentEventId,
      action: 'spt-getCpuPriority',
      results: this.threadSlice,
    });
  }
  private sptGetCpuPriorityByTime(params: { leftNs: number; rightNs: number; cpus: Array<number> }): void {
    const result = this.threadSlice.filter((item: ThreadSlice) => {
      return !(item.endTs! < params.leftNs || item.startTs! > params.rightNs);
    });
    self.postMessage({
      id: this.currentEventId,
      action: 'spt-getCpuPriorityByTime',
      results: result,
    });
  }
  queryData(queryName: string, sql: string, args: unknown): void {
    self.postMessage({
      id: this.currentEventId,
      type: queryName,
      isQuery: true,
      args: args,
      sql: sql,
    });
  }

  getThreadState(): void {
    this.queryData(
      'spt-init',
      `
    select
       state,
       dur,
       (ts - start_ts) as startTs,
       (ts - start_ts + dur) as endTs,
       cpu,
       tid,
       itid as itId,
       arg_setid as argSetID,
       pid
from thread_state,trace_range where dur > 0 and (ts - start_ts) >= 0;
`,
      {}
    );
  }

  private getPTSData(ptsLeftNs: number, ptsRightNs: number, cpus: Array<number>): unknown[] {
    let ptsFilter = this.threadSlice.filter(
      (it) =>
        Math.max(ptsLeftNs, it.startTs!) < Math.min(ptsRightNs, it.startTs! + it.dur!) &&
        (it.cpu === null || it.cpu === undefined || cpus.includes(it.cpu))
    );
    let group: unknown = {};
    ptsFilter.forEach((slice) => {
      let title = `S-${slice.state}`;
      let item = this.setStateData(slice, title) as SPT;
      //@ts-ignore
      if (group[`${slice.pid}`]) {
        //@ts-ignore
        let process = group[`${slice.pid}`] as SPT;
        process.count += 1;
        process.wallDuration += slice.dur!;
        process.minDuration = Math.min(process.minDuration, slice.dur!);
        process.maxDuration = Math.max(process.maxDuration, slice.dur!);
        process.avgDuration = (process.wallDuration / process.count).toFixed(2);
        let thread = process.children.find((child: SPT) => child.title === `T-${slice.tid}`);
        if (thread) {
          thread.count += 1;
          thread.wallDuration += slice.dur!;
          thread.minDuration = Math.min(thread.minDuration, slice.dur!);
          thread.maxDuration = Math.max(thread.maxDuration, slice.dur!);
          thread.avgDuration = (thread.wallDuration / thread.count).toFixed(2);
          let state = thread.children.find((child: SPT) => child.title === `S-${slice.state}`);
          if (state) {
            state.count += 1;
            state.wallDuration += slice.dur!;
            state.minDuration = Math.min(state.minDuration, slice.dur!);
            state.maxDuration = Math.max(state.maxDuration, slice.dur!);
            state.avgDuration = (state.wallDuration / state.count).toFixed(2);
          } else {
            thread.children.push(item);
          }
        } else {
          let processChild = this.setThreadData(slice, item) as SPT;
          process.children.push(processChild);
        }
      } else {
        //@ts-ignore
        group[`${slice.pid}`] = this.setProcessData(slice, item);
      }
    });
    //@ts-ignore
    return Object.values(group);
  }
  private setStateData(slice: ThreadSlice, title: string): unknown {
    return {
      title: title,
      count: 1,
      state: slice.state,
      tid: slice.tid,
      pid: slice.pid,
      minDuration: slice.dur || 0,
      maxDuration: slice.dur || 0,
      wallDuration: slice.dur || 0,
      avgDuration: `${slice.dur}`,
    };
  }
  private setProcessData(slice: ThreadSlice, item: SPT): unknown {
    return {
      title: `P-${slice.pid}`,
      count: 1,
      pid: slice.pid,
      minDuration: slice.dur || 0,
      maxDuration: slice.dur || 0,
      wallDuration: slice.dur || 0,
      avgDuration: `${slice.dur}`,
      children: [
        {
          title: `T-${slice.tid}`,
          count: 1,
          pid: slice.pid,
          tid: slice.tid,
          minDuration: slice.dur || 0,
          maxDuration: slice.dur || 0,
          wallDuration: slice.dur || 0,
          avgDuration: `${slice.dur}`,
          children: [item],
        },
      ],
    };
  }
  private setThreadData(slice: ThreadSlice, item: SPT): unknown {
    return {
      title: `T-${slice.tid}`,
      count: 1,
      tid: slice.tid,
      pid: slice.pid,
      minDuration: slice.dur || 0,
      maxDuration: slice.dur || 0,
      wallDuration: slice.dur || 0,
      avgDuration: `${slice.dur}`,
      children: [item],
    };
  }
  private getSPTData(sptLeftNs: number, sptRightNs: number, cpus: Array<number>): unknown {
    let sptFilter = this.threadSlice.filter(
      (it) =>
        Math.max(sptLeftNs, it.startTs!) < Math.min(sptRightNs, it.startTs! + it.dur!) &&
        (it.cpu === null || it.cpu === undefined || cpus.includes(it.cpu))
    );
    let group: unknown = {};
    sptFilter.forEach((slice) => {
      let item = {
        title: `T-${slice.tid}`,
        count: 1,
        state: slice.state,
        pid: slice.pid,
        tid: slice.tid,
        minDuration: slice.dur || 0,
        maxDuration: slice.dur || 0,
        wallDuration: slice.dur || 0,
        avgDuration: `${slice.dur}`,
      } as SPT;
      //@ts-ignore
      if (group[`${slice.state}`]) {
        this.setSPTData(group, slice, item);
      } else {
        //@ts-ignore
        group[`${slice.state}`] = {
          title: `S-${slice.state}`,
          count: 1,
          state: slice.state,
          minDuration: slice.dur || 0,
          maxDuration: slice.dur || 0,
          wallDuration: slice.dur || 0,
          avgDuration: `${slice.dur}`,
          children: [
            {
              title: `P-${slice.pid}`,
              count: 1,
              state: slice.state,
              pid: slice.pid,
              minDuration: slice.dur || 0,
              maxDuration: slice.dur || 0,
              wallDuration: slice.dur || 0,
              avgDuration: `${slice.dur}`,
              children: [item],
            },
          ],
        };
      }
    });
    //@ts-ignore
    return Object.values(group);
  }
  private setSPTData(group: unknown, slice: ThreadSlice, item: SPT): void {
    //@ts-ignore
    let state = group[`${slice.state}`];
    state.count += 1;
    state.wallDuration += slice.dur;
    state.minDuration = Math.min(state.minDuration, slice.dur!);
    state.maxDuration = Math.max(state.maxDuration, slice.dur!);
    state.avgDuration = (state.wallDuration / state.count).toFixed(2);
    let process = state.children.find((child: SPT) => child.title === `P-${slice.pid}`);
    if (process) {
      process.count += 1;
      process.wallDuration += slice.dur;
      process.minDuration = Math.min(process.minDuration, slice.dur!);
      process.maxDuration = Math.max(process.maxDuration, slice.dur!);
      process.avgDuration = (process.wallDuration / process.count).toFixed(2);
      let thread = process.children.find((child: SPT) => child.title === `T-${slice.tid}`);
      if (thread) {
        thread.count += 1;
        thread.wallDuration += slice.dur;
        thread.minDuration = Math.min(thread.minDuration, slice.dur!);
        thread.maxDuration = Math.max(thread.maxDuration, slice.dur!);
        thread.avgDuration = (thread.wallDuration / thread.count).toFixed(2);
      } else {
        process.children.push(item);
      }
    } else {
      state.children.push({
        title: `P-${slice.pid}`,
        count: 1,
        state: slice.state,
        pid: slice.pid,
        minDuration: slice.dur || 0,
        maxDuration: slice.dur || 0,
        wallDuration: slice.dur || 0,
        avgDuration: `${slice.dur}`,
        children: [item],
      });
    }
  }
}

export class ThreadSlice {
  state?: string;
  dur?: number;
  startTs?: number;
  endTs?: number;
  cpu?: number | null;
  tid?: number;
  pid?: number;
  itId?: number;
  priorityType?: string;
  end_state?: string;
  priority?: number;
  argSetID?: number;
}
/*
 * Copyright (C) 2022 Huawei Device Co., Ltd.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { BaseElement, element } from '../../../base-ui/BaseElement';
import { TimeRuler } from './timer-shaft/TimeRuler';
import { Rect } from './timer-shaft/Rect';
import { RangeRuler, TimeRange } from './timer-shaft/RangeRuler';
import { SlicesTime, SportRuler } from './timer-shaft/SportRuler';
import { procedurePool } from '../../database/Procedure';
import { Flag } from './timer-shaft/Flag';
import { info } from '../../../log/Log';
import { TraceSheet } from './base/TraceSheet';
import { SelectionParam } from '../../bean/BoxSelection';
import { type SpSystemTrace, CurrentSlicesTime } from '../SpSystemTrace';
import './timer-shaft/CollapseButton';
import { TimerShaftElementHtml } from './TimerShaftElement.html';
import { SpChartList } from './SpChartList';
//随机生成十六位进制颜色
//@ts-ignore
export function randomRgbColor(): string {
  let r = Math.floor(Math.random() * 255);
  let g = Math.floor(Math.random() * 255);
  let b = Math.floor(Math.random() * 255);
  if (r * 0.299 + g * 0.587 + b * 0.114 < 192) {
    let r16 = r.toString(16).length === 1 && r.toString(16) <= 'f' ? 0 + r.toString(16) : r.toString(16);
    let g16 = g.toString(16).length === 1 && g.toString(16) <= 'f' ? 0 + g.toString(16) : g.toString(16);
    let b16 = b.toString(16).length === 1 && b.toString(16) <= 'f' ? 0 + b.toString(16) : b.toString(16);
    let color = '#' + r16 + g16 + b16;
    return color;
  } else {
    randomRgbColor();
  }
}

export function ns2s(ns: number): string {
  let oneSecond = 1_000_000_000; // 1 second
  let oneMillisecond = 1_000_000; // 1 millisecond
  let oneMicrosecond = 1_000; // 1 microsecond
  let nanosecond1 = 1000.0;
  let result;
  if (ns >= oneSecond) {
    result = (ns / 1000 / 1000 / 1000).toFixed(1) + ' s';
  } else if (ns >= oneMillisecond) {
    result = (ns / 1000 / 1000).toFixed(1) + ' ms';
  } else if (ns >= oneMicrosecond) {
    result = (ns / 1000).toFixed(1) + ' μs';
  } else if (ns > 0) {
    result = ns.toFixed(1) + ' ns';
  } else {
    result = ns.toFixed(1) + ' s';
  }
  return result;
}

export function ns2UnitS(ns: number, scale: number): string {
  let oneSecond = 1_000_000_000; // 1 second
  let result;
  if (scale >= 10_000_000_000) {
    result = (ns / oneSecond).toFixed(0) + ' s';
  } else if (scale >= 1_000_000_000) {
    result = (ns / oneSecond).toFixed(1) + ' s';
  } else if (scale >= 100_000_000) {
    result = (ns / oneSecond).toFixed(2) + ' s';
  } else if (scale >= 10_000_000) {
    result = (ns / oneSecond).toFixed(3) + ' s';
  } else if (scale >= 1_000_000) {
    result = (ns / oneSecond).toFixed(4) + ' s';
  } else if (scale >= 100_000) {
    result = (ns / oneSecond).toFixed(5) + ' s';
  } else {
    result = (ns / oneSecond).toFixed(6) + ' s';
  }
  return result;
}

export function ns2x(ns: number, startNS: number, endNS: number, duration: number, rect: Rect): number {
  if (endNS === 0) {
    endNS = duration;
  }
  let xSize: number = ((ns - startNS) * rect.width) / (endNS - startNS);
  if (xSize < 0) {
    xSize = 0;
  }
  if (xSize > rect.width) {
    xSize = rect.width;
  }
  return xSize;
}

@element('timer-shaft-element')
export class TimerShaftElement extends BaseElement {
  // @ts-ignore
  offscreen: OffscreenCanvas | undefined;
  isOffScreen: boolean = false;
  public ctx: CanvasRenderingContext2D | undefined | null;
  public canvas: HTMLCanvasElement | null | undefined;
  public totalEL: HTMLDivElement | null | undefined;
  public timeTotalEL: HTMLSpanElement | null | undefined;
  public timeOffsetEL: HTMLSpanElement | null | undefined;
  public collectGroup: HTMLDivElement | null | undefined;
  public collect1: HTMLInputElement | null | undefined;
  public loadComplete: boolean = false;
  public collecBtn: HTMLElement | null | undefined;
  rangeChangeHandler: ((timeRange: TimeRange) => void) | undefined = undefined;
  rangeClickHandler: ((sliceTime: SlicesTime | undefined | null) => void) | undefined = undefined;
  flagChangeHandler: ((hoverFlag: Flag | undefined | null, selectFlag: Flag | undefined | null) => void) | undefined =
    undefined;
  flagClickHandler: ((flag: Flag | undefined | null) => void) | undefined = undefined;
  /**
   * 离线渲染需要的变量
   */
  dpr = window.devicePixelRatio || 1;
  frame: Rect = new Rect(0, 0, 0, 0);
  must: boolean = true;
  hoverX: number = 0;
  hoverY: number = 0;
  canvasWidth: number = 0;
  canvasHeight: number = 0;
  _cpuUsage: Array<{ cpu: number; ro: number; rate: number }> = [];
  protected timeRuler: TimeRuler | undefined;
  protected _rangeRuler: RangeRuler | undefined;
  protected _sportRuler: SportRuler | undefined;
  private root: HTMLDivElement | undefined | null;
  private _totalNS: number = 10_000_000_000;
  private _startNS: number = 0;
  private _endNS: number = 10_000_000_000;
  private traceSheetEL: TraceSheet | undefined | null;
  private sliceTime: SlicesTime | undefined | null;
  public selectionList: Array<SelectionParam> = [];
  public selectionMap: Map<string, SelectionParam> = new Map<string, SelectionParam>();
  public usageEL: HTMLDivElement | null | undefined;
  public timerShaftEL: TimerShaftElement | null | undefined;
  public rowsPaneEL: HTMLDivElement | null | undefined;
  public favoriteChartListEL: SpChartList | undefined | null;
  _checkExpand: boolean = false; //是否展开
  _usageFoldHeight: number = 56.25; //初始化时折叠的负载区高度
  usageExpandHeight: number = 75; //给定的展开的负载区高度
  _cpuUsageCount: Array<{ cpu: number; ro: number; rate: number }> = [];

  get sportRuler(): SportRuler | undefined {
    return this._sportRuler;
  }

  get rangeRuler(): RangeRuler | undefined {
    return this._rangeRuler;
  }

  set cpuUsage(value: Array<{ cpu: number; ro: number; rate: number }>) {
    info('set cpuUsage values :', value);
    this._cpuUsage = value;

    this._cpuUsageCount = value;
    if (this._cpuUsageCount.length) {
      this.usageEL!.innerHTML = 'CPU Usage';
    }

    if (this._rangeRuler) {
      this._rangeRuler.cpuUsage = this._cpuUsage;
    }
  }

  get checkExpand(): boolean {
    return this._checkExpand;
  }

  set checkExpand(value: boolean) {
    this._checkExpand = value;
  }

  get usageFoldHeight(): number {
    return this._usageFoldHeight;
  }
  set usageFoldHeight(value: number) {
    this._usageFoldHeight = value;
  }

  get totalNS(): number {
    return this._totalNS;
  }

  set totalNS(value: number) {
    info('set totalNS values :', value);
    this._totalNS = value;
    if (this.timeRuler) {
      this.timeRuler.totalNS = value;
    }
    if (this._rangeRuler) {
      this._rangeRuler.range.totalNS = value;
    }
    if (this.timeTotalEL) {
      this.timeTotalEL.textContent = `${ns2s(value)}`;
    }
    requestAnimationFrame(() => this.render());
  }

  get startNS(): number {
    return this._startNS;
  }

  set startNS(value: number) {
    this._startNS = value;
  }

  get endNS(): number {
    return this._endNS;
  }

  set endNS(value: number) {
    this._endNS = value;
  }

  reset(): void {
    this.loadComplete = false;
    this.totalNS = 10_000_000_000;
    this.startNS = 0;
    this.endNS = 10_000_000_000;
    if (this._rangeRuler) {
      this._rangeRuler.drawMark = false;
      this._rangeRuler.range.totalNS = this.totalNS;
      this._rangeRuler.markAObj.frame.x = 0;
      this._rangeRuler.markBObj.frame.x = this._rangeRuler.frame.width;
      this._rangeRuler.cpuUsage = [];
      this.sportRuler!.flagList.length = 0;
      this.sportRuler!.slicesTimeList.length = 0;
      this.selectionList.length = 0;
      this.selectionMap.clear();
      this._rangeRuler.rangeRect = new Rect(0, 25, this.canvas?.clientWidth || 0, 75);
      this.sportRuler!.isRangeSelect = false;
      this.setSlicesMark();
    }
    this.removeTriangle('inverted');
    this.setRangeNS(0, this.endNS);
    //---------------每次导入trace时触发渲染-----------------
    if (this._rangeRuler && this._sportRuler) {
      this.canvas!.width = this.canvas!.clientWidth || 0;
      sessionStorage.setItem('foldHeight', String(56.25));
      if (this._checkExpand && this._checkExpand === true) {
        this._checkExpand = false;
        sessionStorage.setItem('expand', String(this._checkExpand));
      }
      sessionStorage.setItem('expand', String(this._checkExpand));
      this.usageEL!.innerHTML = '';
      this.usageEL!.style.height = `${100 - 56.25}px`;
      this.usageEL!.style.lineHeight = `${100 - 56.25}px`;
      this.timerShaftEL!.style.height = `${146 - 56.25 + 2}px`;
      this.canvas!.style.height = `${146 - 56.25}px`;
      this.canvas!.height = 146 - 56.25;
      this.rowsPaneEL!.style.maxHeight = '100%';
      this._sportRuler.frame.y = 43.75;

      this.render();
      this._checkExpand = true;
      this._cpuUsageCount = []; //清空判断数据
    }
  }

  initElements(): void {
    this.root = this.shadowRoot?.querySelector('.root');
    this.canvas = this.shadowRoot?.querySelector('.panel');
    this.totalEL = this.shadowRoot?.querySelector('.total');
    this.collect1 = this.shadowRoot?.querySelector('#collect1');
    this.timeTotalEL = this.shadowRoot?.querySelector('.time-total');
    this.timeOffsetEL = this.shadowRoot?.querySelector('.time-offset');
    this.collecBtn = this.shadowRoot?.querySelector('.time-collect');
    this.collectGroup = this.shadowRoot?.querySelector('.collect_group');
    this.collectGroup?.addEventListener('click', (e) => {
      // @ts-ignore
      if (e.target && e.target.tagName === 'INPUT') {
        // @ts-ignore
        window.publish(window.SmartEvent.UI.CollectGroupChange, e.target.value);
      }
    });
    // @ts-ignore
    procedurePool.timelineChange = (a: unknown): void => this.rangeChangeHandler?.(a);
    // @ts-ignore
    window.subscribe(window.SmartEvent.UI.TimeRange, (b) => this.setRangeNS(b.startNS, b.endNS));
    // -----------------------------点击负载区展开折叠---------------------------------
    this.usageEL = this.shadowRoot?.querySelector('.cpu-usage');
    this.timerShaftEL = this.shadowRoot!.host.parentNode?.querySelector('.timer-shaft');
    this.rowsPaneEL = this.shadowRoot!.host.parentNode?.querySelector('.rows-pane');
    this.favoriteChartListEL = this.shadowRoot!.host.parentNode?.querySelector('#favorite-chart-list');
    const height = this.canvas?.clientHeight || 0;
    // 点击cpu usage部分，切换折叠展开
    this.usageEL?.addEventListener('click', (e) => {
      if (this._rangeRuler && this.sportRuler && this._cpuUsageCount.length) {
        // 计算需要被收起来的高度：总高度75-（总高度/cpu数量）* 2
        this._usageFoldHeight = this.usageExpandHeight - (this.usageExpandHeight / this._rangeRuler.cpuCountData!) * 2;
        this.canvas!.width = this.canvas!.clientWidth || 0;
        if (this._checkExpand) {
          sessionStorage.setItem('expand', String(this._checkExpand));
          sessionStorage.setItem('foldHeight', String(this._usageFoldHeight));
          this.usageEL!.style.height = '100px';
          this.usageEL!.style.lineHeight = '100px';
          this.timerShaftEL!.style.height = `${height + 2}px`;
          this.canvas!.style.height = `${height}px`;
          this.canvas!.height = height;
          this._rangeRuler.frame.height = 75;
          this.sportRuler.frame.y = 100;
          this.render();
          this._checkExpand = false;
          this.favoriteChartListEL?.refreshFavoriteCanvas(); //刷新收藏泳道画布高度
        } else {
          sessionStorage.setItem('expand', String(this._checkExpand));
          sessionStorage.setItem('foldHeight', String(this._usageFoldHeight));
          this.usageEL!.style.height = `${100 - this._usageFoldHeight}px`;
          this.usageEL!.style.lineHeight = `${100 - this._usageFoldHeight}px`;
          this.timerShaftEL!.style.height = `${height - this._usageFoldHeight + 2}px`;
          this.canvas!.style.height = `${height - this._usageFoldHeight}px`;
          this.canvas!.height = height - this._usageFoldHeight;
          this._rangeRuler.frame.height = 75 - this._usageFoldHeight;
          this.sportRuler.frame.y = 100 - this._usageFoldHeight;
          this.render();
          this._checkExpand = true;
          this.favoriteChartListEL?.refreshFavoriteCanvas(); //刷新收藏泳道画布高度
        }
      }
    });
  }

  getRangeRuler(): RangeRuler | undefined {
    return this._rangeRuler;
  }

  connectedCallback(): RangeRuler | undefined {
    if (this.canvas) {
      if (this.isOffScreen) {
        // @ts-ignore
        this.offscreen = this.canvas.transferControlToOffscreen();
        return;
      } else {
        this.ctx = this.canvas?.getContext('2d', { alpha: true });
      }
    }
    if (this.timeTotalEL) {
      this.timeTotalEL.textContent = ns2s(this._totalNS);
    }
    if (this.timeOffsetEL && this._rangeRuler) {
      this.timeOffsetEL.textContent = ns2UnitS(this._startNS, this._rangeRuler.getScale());
    }
    const width = this.canvas?.clientWidth || 0;
    const height = this.canvas?.clientHeight || 0;
    this.setTimeRuler(width);
    this.setSportRuler(width, height);
    this.setRangeRuler(width);
  }

  private setTimeRuler(width: number): void {
    if (!this.timeRuler) {
      this.timeRuler = new TimeRuler(this, new Rect(0, 0, width, 20), this._totalNS);
    }
    this.timeRuler.frame.width = width;
  }

  private setSportRuler(width: number, height: number): void {
    if (!this._sportRuler) {
      this._sportRuler = new SportRuler(
        this,
        new Rect(0, 100, width, height - 100),
        (hoverFlag, selectFlag) => {
          this.flagChangeHandler?.(hoverFlag, selectFlag);
        },
        (flag) => {
          this.flagClickHandler?.(flag);
        },
        (slicetime) => {
          this.rangeClickHandler?.(slicetime);
        }
      );
    }
    this._sportRuler.frame.width = width;
  }

  private setRangeRuler(width: number): void {
    if (!this._rangeRuler) {
      this._rangeRuler = new RangeRuler(
        this,
        new Rect(0, 25, width, 75 - this._usageFoldHeight),
        {
          slicesTime: {
            startTime: null,
            endTime: null,
            color: null,
          },
          scale: 0,
          startX: 0,
          endX: this.canvas?.clientWidth || 0,
          startNS: 0,
          endNS: this.totalNS,
          totalNS: this.totalNS,
          refresh: true,
          xs: [],
          xsTxt: [],
        },
        (a) => {
          if (a.startNS >= 0 && a.endNS >= 0) {
            if (this._sportRuler) {
              this._sportRuler.range = a;
            }
            if (this.timeOffsetEL && this._rangeRuler) {
              this.timeOffsetEL.textContent = ns2UnitS(a.startNS, this._rangeRuler.getScale());
            }
            if (this.loadComplete) {
              this.rangeChangeHandler?.(a);
            }
          }
        }
      );
    }
    this._rangeRuler.frame.width = width;
  }

  setRangeNS(startNS: number, endNS: number): void {
    info('set startNS values :' + startNS + 'endNS values : ' + endNS);
    this._rangeRuler?.setRangeNS(startNS, endNS);
  }

  getRange(): TimeRange | undefined {
    return this._rangeRuler?.getRange();
  }

  updateWidth(width: number): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas!.width = width - (this.totalEL?.clientWidth || 0);
    this.canvas!.height = this.shadowRoot!.host.clientHeight || 0;
    let oldWidth = this.canvas!.width;
    let oldHeight = this.canvas!.height;
    this.canvas!.width = Math.ceil(oldWidth * this.dpr);
    this.canvas!.height = Math.ceil(oldHeight * this.dpr);
    this.canvas!.style.width = oldWidth + 'px';
    this.canvas!.style.height = oldHeight + 'px';
    this.ctx?.scale(this.dpr, this.dpr);
    this.ctx?.translate(0, 0);
    this._rangeRuler!.frame.width = oldWidth;
    this._sportRuler!.frame.width = oldWidth;
    this.timeRuler!.frame.width = oldWidth;
    this._rangeRuler?.fillX();
    this.render();
  }

  documentOnMouseDown = (ev: MouseEvent): void => {
    // @ts-ignore
    if ((window as unknown).isSheetMove) {
      return;
    }
    this._rangeRuler?.mouseDown(ev);
  };

  documentOnMouseUp = (ev: MouseEvent): void => {
    // @ts-ignore
    if ((window as unknown).isSheetMove) {
      return;
    }
    this._rangeRuler?.mouseUp(ev);
    this.sportRuler?.mouseUp(ev);
  };

  documentOnMouseMove = (ev: MouseEvent, trace: SpSystemTrace): void => {
    trace.style.cursor = 'default';
    let x = ev.offsetX - (this.canvas?.offsetLeft || 0); // 鼠标的x轴坐标
    let y = ev.offsetY; // 鼠标的y轴坐标
    let findSlicestime = this.sportRuler?.findSlicesTime(x, y); // 查找帽子
    if (!findSlicestime) {
      // 如果在该位置没有找到一个“帽子”，则可以显示一个旗子。
      this.sportRuler?.showHoverFlag();
      this._rangeRuler?.mouseMove(ev, trace);
      if (this.sportRuler?.edgeDetection(ev)) {
        this.sportRuler?.mouseMove(ev);
      } else {
        this.sportRuler?.mouseOut(ev);
      }
    } else {
      this.sportRuler?.clearHoverFlag();
      this.sportRuler?.modifyFlagList(null); //重新绘制旗子，清除hover flag
    }
  };

  documentOnMouseOut = (ev: MouseEvent): void => {
    this._rangeRuler?.mouseOut(ev);
    this.sportRuler?.mouseOut(ev);
  };

  documentOnKeyPress = (ev: KeyboardEvent, currentSlicesTime?: CurrentSlicesTime): void => {
    // @ts-ignore
    if ((window as unknown).flagInputFocus) {
      return;
    }
    this._rangeRuler?.keyPress(ev, currentSlicesTime);
    this.sportRuler?.clearHoverFlag();
  };

  documentOnKeyUp = (ev: KeyboardEvent): void => {
    // @ts-ignore
    if ((window as unknown).flagInputFocus) {
      return;
    }
    this._rangeRuler?.keyUp(ev);
  };

  disconnectedCallback(): void {}

  firstRender = true;

  lineColor(): string {
    return window.getComputedStyle(this.canvas!, null).getPropertyValue('color');
  }

  render(): void {
    this.dpr = window.devicePixelRatio || 1;
    if (this.ctx) {
      this.ctx.fillStyle = 'transparent';
      this.ctx?.fillRect(0, 0, this.canvas?.width || 0, this.canvas?.height || 0);
      this.timeRuler?.draw();
      this._rangeRuler?.draw();
      this._sportRuler?.draw();
    } else {
      procedurePool.submitWithName(
        'timeline',
        'timeline',
        {
          offscreen: this.must ? this.offscreen : undefined, //是否离屏
          dpr: this.dpr, //屏幕dpr值
          hoverX: this.hoverX,
          hoverY: this.hoverY,
          canvasWidth: this.canvasWidth,
          canvasHeight: this.canvasHeight,
          keyPressCode: null,
          keyUpCode: null,
          lineColor: '#dadada',
          startNS: this.startNS,
          endNS: this.endNS,
          totalNS: this.totalNS,
          frame: this.frame,
        },
        this.must ? this.offscreen : undefined,
        (res: unknown) => {
          this.must = false;
        }
      );
    }
  }

  modifyFlagList(flag: Flag | null | undefined): void {
    this._sportRuler?.modifyFlagList(flag);
  }

  modifySlicesList(slicestime: SlicesTime | null | undefined): void {
    this._sportRuler?.modifySicesTimeList(slicestime);
  }
  cancelPressFrame(): void {
    this._rangeRuler?.cancelPressFrame();
  }

  cancelUpFrame(): void {
    this._rangeRuler?.cancelUpFrame();
  }

  stopWASD(ev: unknown): void {
    // @ts-ignore
    this._rangeRuler?.keyUp(ev);
  }

  drawTriangle(time: number, type: string): unknown {
    return this._sportRuler?.drawTriangle(time, type);
  }

  removeTriangle(type: string): void {
    this._sportRuler?.removeTriangle(type);
  }

  setSlicesMark(
    startTime: null | number = null,
    endTime: null | number = null,
    shiftKey: null | boolean = false
  ): SlicesTime | null | undefined {
    let sliceTime = this._sportRuler?.setSlicesMark(startTime, endTime, shiftKey);
    if (sliceTime && sliceTime !== undefined) {
      this.traceSheetEL?.displayCurrent(sliceTime); // 给当前pane准备数据

      // 取最新创建的那个selection对象
      let selection = this.selectionList[this.selectionList.length - 1];
      if (selection) {
        selection.isCurrentPane = true; // 设置当前面板为可以显示的状态
        //把刚刚创建的slicetime和selection对象关联起来，以便后面再次选中“跑道”的时候显示对应的面板。
        this.selectionMap.set(sliceTime.id, selection);
        this.traceSheetEL?.rangeSelect(selection); // 显示选中区域对应的面板
      }
    }
    return sliceTime;
  }

  displayCollect(showCollect: boolean): void {
    if (showCollect) {
      this.collecBtn!.style.display = 'flex';
    } else {
      this.collecBtn!.style.display = 'none';
    }
  }

  initHtml(): string {
    return TimerShaftElementHtml;
  }
}
export class SpQuerySQL extends BaseElement {
    private queryTableEl: LitTable | undefined;
    private notSupportList: Array<string> | undefined = [];
    private querySize: HTMLElement | undefined;
    private keyList: Array<string> | undefined;
    private selector: HTMLTextAreaElement | undefined;
    private isSupportSql: boolean = true;
    private response: HTMLDivElement | undefined;
    private statDataArray: unknown[] = [];
    private sliceData: unknown[] = [];
    private querySqlErrorText: string = '';
    private progressLoad: LitProgressBar | undefined;
    private pagination: PaginationBox | undefined;
    private sqlListDiv: HTMLDivElement | undefined;
  
    initElements(): void {
      this.progressLoad = this.shadowRoot?.querySelector('.load-query-sql') as LitProgressBar;
      this.selector = this.shadowRoot?.querySelector('.sql-select') as HTMLTextAreaElement;
      this.queryTableEl = this.shadowRoot?.querySelector('lit-table') as LitTable;
      this.queryTableEl.setAttribute('data-query-scene', '');
      this.querySize = this.shadowRoot?.querySelector('.query_size') as HTMLElement;
      this.response = this.shadowRoot?.querySelector('#dataResult') as HTMLDivElement;
      this.pagination = this.shadowRoot?.querySelector('.pagination-box') as PaginationBox;
      this.notSupportList?.push('insert', 'delete', 'update', 'drop', 'alter', 'truncate', 'create');
      this.sqlListDiv = this.shadowRoot?.querySelector('#sqlList') as HTMLDivElement;
      let htmlDivElement = this.queryTableEl.shadowRoot?.querySelector('.table') as HTMLDivElement;
      htmlDivElement.style.overflowX = 'scroll';
      window.addEventListener('resize', () => {
        this.freshTableHeadResizeStyle();
      });
      let copyButtonEl = this.shadowRoot?.querySelector('#copy-button') as HTMLButtonElement;
      copyButtonEl.addEventListener('click', () => {
        this.copyTableData();
      });
      let closeButtonEl = this.shadowRoot?.querySelector('#close-button') as HTMLButtonElement;
      closeButtonEl.addEventListener('click', () => {
        this.pagination!.style.display = 'none';
        this.querySize!.textContent = 'Query result - 0 counts.';
        this.queryTableEl!.dataSource = [];
        this.response!.innerHTML = '';
      });
      this.initCommonList();
    }
  
    private initCommonList(): void {
      let commonSqlList = getAllSql();
      if (commonSqlList.length > 0) {
        for (let i = 0; i < commonSqlList.length; i++) {
          let commonSqlDiv = document.createElement('div');
          commonSqlDiv.className = 'sql-item';
          let sql = document.createElement('div');
          sql.className = 'sql';
          sql.textContent = commonSqlList[i].sql;
          let runButton = document.createElement('lit-icon');
          runButton.className = 'runButton';
          runButton.title = commonSqlList[i].title;
          runButton.setAttribute('size', '20');
          runButton.setAttribute('name', 'run-sql');
          commonSqlDiv.appendChild(sql);
          commonSqlDiv.appendChild(runButton);
          this.sqlListDiv?.append(commonSqlDiv);
        }
      }
    }
  
    private freshTableHeadResizeStyle(): void {
      let th = this.queryTableEl!.shadowRoot?.querySelector<HTMLDivElement>('.th');
      if (th) {
        let td = th.querySelectorAll<HTMLDivElement>('.td');
        let firstChild = this.queryTableEl!.shadowRoot?.querySelector<HTMLDivElement>('.body')!.firstElementChild;
        if (firstChild) {
          let bodyList = firstChild.querySelectorAll<HTMLDivElement>('.td');
          for (let index = 0; index < bodyList.length; index++) {
            td[index].style.width = `${bodyList[index].offsetWidth}px`;
            td[index].style.overflow = 'hidden';
          }
        }
      }
      let tableHeadStyle: HTMLDivElement | undefined | null = this.queryTableEl?.shadowRoot?.querySelector(
        'div.th'
      ) as HTMLDivElement;
      if (tableHeadStyle && tableHeadStyle.hasChildNodes()) {
        for (let index = 0; index < tableHeadStyle.children.length; index++) {
          // @ts-ignore
          tableHeadStyle.children[index].style.gridArea = null;
        }
      }
      this.queryTableEl!.style.height = '100%';
    }
  
    private async copyTableData(): Promise<void> {
      let copyResult = '';
      for (let keyListKey of this.keyList!) {
        copyResult += `${keyListKey}\t`;
      }
      copyResult += '\n';
      let copyData: unknown[];
      if (this.statDataArray.length > maxPageSize) {
        copyData = this.sliceData;
      } else {
        copyData = this.statDataArray;
      }
      for (const value of copyData) {
        this.keyList?.forEach((key) => {
          // @ts-ignore
          copyResult += `${value[key]}\t`;
        });
        copyResult += '\n';
      }
      await navigator.clipboard.writeText(copyResult);
    }
  
    selectEventListener = (event: KeyboardEvent): void => {
      let enterKey = 13;
      if (event.ctrlKey && event.keyCode === enterKey) {
        SpStatisticsHttpUtil.addOrdinaryVisitAction({
          event: 'query',
          action: 'query',
        });
        this.statDataArray = [];
        this.keyList = [];
        this.response!.innerHTML = '';
        this.queryTableEl!.innerHTML = '';
        this.pagination!.style.display = 'none';
        if (this.isSupportSql) {
          this.executeSql(this.selector!.value);
        } else {
          this.querySize!.textContent = this.querySqlErrorText;
          this.queryTableEl!.dataSource = [];
          this.response!.innerHTML = '';
          return;
        }
      }
    };
  
    private executeSql(sql: string): void {
      this.progressLoad!.loading = true;
      if (this.querySize) {
        this.querySize!.title = `${sql}`;
      }
      queryCustomizeSelect(sql).then((resultList): void => {
        if (resultList && resultList.length > 0) {
          this.statDataArray = resultList;
          //@ts-ignore
          this.keyList = Object.keys(resultList[0]);
          this.querySize!.textContent = `Query result - ${this.statDataArray.length} counts.` + `(${sql})`;
          this.initDataElement();
          this.response!.appendChild(this.queryTableEl!);
          this.setPageNationTableEl();
          setTimeout(() => {
            if (this.parentElement?.clientHeight !== 0) {
              this.queryTableEl!.style.height = '100%';
              this.queryTableEl!.reMeauseHeight();
            }
          }, 300);
        } else {
          this.querySize!.textContent = `Query result - ${this.statDataArray.length} counts.` + `(${sql})`;
          this.progressLoad!.loading = false;
        }
      });
    }
  
    private setPageNationTableEl(): void {
      let timeOutTs: number = 200;
      let indexNumber = 1;
      setTimeout(() => {
        let total = this.statDataArray.length;
        if (total > maxPageSize) {
          this.pagination!.style.display = 'block';
          this.pagination!.style.opacity = '1';
          const option = {
            current: 1,
            total: total,
            pageSize: pageSize,
            change: (num: number): void => {
              this.sliceData = this.statDataArray!.slice((num - indexNumber) * pageSize, num * pageSize);
              this.queryTableEl!.recycleDataSource = this.sliceData;
            },
          };
          new PageNation(this.pagination, option);
        } else {
          this.pagination!.style.opacity = '0';
          this.queryTableEl!.recycleDataSource = this.statDataArray;
        }
        this.freshTableHeadResizeStyle();
        this.progressLoad!.loading = false;
      }, timeOutTs);
    }
    if (this._rangeRuler && this._sportRuler) {
      this.canvas!.width = this.canvas!.clientWidth || 0;
      sessionStorage.setItem('foldHeight', String(56.25));
      if (this._checkExpand && this._checkExpand === true) {
        this._checkExpand = false;
        sessionStorage.setItem('expand', String(this._checkExpand));
      }
      sessionStorage.setItem('expand', String(this._checkExpand));
      this.usageEL!.innerHTML = '';
      this.usageEL!.style.height = `${100 - 56.25}px`;
      this.usageEL!.style.lineHeight = `${100 - 56.25}px`;
      this.timerShaftEL!.style.height = `${146 - 56.25 + 2}px`;
      this.canvas!.style.height = `${146 - 56.25}px`;
      this.canvas!.height = 146 - 56.25;
      this.rowsPaneEL!.style.maxHeight = '100%';
      this._sportRuler.frame.y = 43.75;

      this.render();
      this._checkExpand = true;
      this._cpuUsageCount = []; //清空判断数据
    }
  }

  initElements(): void {
    this.root = this.shadowRoot?.querySelector('.root');
    this.canvas = this.shadowRoot?.querySelector('.panel');
    this.totalEL = this.shadowRoot?.querySelector('.total');
    this.collect1 = this.shadowRoot?.querySelector('#collect1');
    this.timeTotalEL = this.shadowRoot?.querySelector('.time-total');
    this.timeOffsetEL = this.shadowRoot?.querySelector('.time-offset');
    this.collecBtn = this.shadowRoot?.querySelector('.time-collect');
    this.collectGroup = this.shadowRoot?.querySelector('.collect_group');
    this.collectGroup?.addEventListener('click', (e) => {
      // @ts-ignore
      if (e.target && e.target.tagName === 'INPUT') {
        // @ts-ignore
        window.publish(window.SmartEvent.UI.CollectGroupChange, e.target.value);
      }
    });
    // @ts-ignore
    procedurePool.timelineChange = (a: unknown): void => this.rangeChangeHandler?.(a);
    // @ts-ignore
    window.subscribe(window.SmartEvent.UI.TimeRange, (b) => this.setRangeNS(b.startNS, b.endNS));
    // -----------------------------点击负载区展开折叠---------------------------------
    this.usageEL = this.shadowRoot?.querySelector('.cpu-usage');
    this.timerShaftEL = this.shadowRoot!.host.parentNode?.querySelector('.timer-shaft');
    this.rowsPaneEL = this.shadowRoot!.host.parentNode?.querySelector('.rows-pane');
    this.favoriteChartListEL = this.shadowRoot!.host.parentNode?.querySelector('#favorite-chart-list');
    const height = this.canvas?.clientHeight || 0;
    // 点击cpu usage部分，切换折叠展开
    this.usageEL?.addEventListener('click', (e) => {
      if (this._rangeRuler && this.sportRuler && this._cpuUsageCount.length) {
        // 计算需要被收起来的高度：总高度75-（总高度/cpu数量）* 2
        this._usageFoldHeight = this.usageExpandHeight - (this.usageExpandHeight / this._rangeRuler.cpuCountData!) * 2;
        this.canvas!.width = this.canvas!.clientWidth || 0;
        if (this._checkExpand) {
          sessionStorage.setItem('expand', String(this._checkExpand));
          sessionStorage.setItem('foldHeight', String(this._usageFoldHeight));
          this.usageEL!.style.height = '100px';
          this.usageEL!.style.lineHeight = '100px';
          this.timerShaftEL!.style.height = `${height + 2}px`;
          this.canvas!.style.height = `${height}px`;
          this.canvas!.height = height;
          this._rangeRuler.frame.height = 75;
          this.sportRuler.frame.y = 100;
          this.render();
          this._checkExpand = false;
          this.favoriteChartListEL?.refreshFavoriteCanvas(); //刷新收藏泳道画布高度
        } else {
          sessionStorage.setItem('expand', String(this._checkExpand));
          sessionStorage.setItem('foldHeight', String(this._usageFoldHeight));
          this.usageEL!.style.height = `${100 - this._usageFoldHeight}px`;
          this.usageEL!.style.lineHeight = `${100 - this._usageFoldHeight}px`;
          this.timerShaftEL!.style.height = `${height - this._usageFoldHeight + 2}px`;
          this.canvas!.style.height = `${height - this._usageFoldHeight}px`;
          this.canvas!.height = height - this._usageFoldHeight;
          this._rangeRuler.frame.height = 75 - this._usageFoldHeight;
          this.sportRuler.frame.y = 100 - this._usageFoldHeight;
          this.render();
          this._checkExpand = true;
          this.favoriteChartListEL?.refreshFavoriteCanvas(); //刷新收藏泳道画布高度
        }
      }
    });
  }

  getRangeRuler(): RangeRuler | undefined {
    return this._rangeRuler;
  }

  connectedCallback(): RangeRuler | undefined {
    if (this.canvas) {
      if (this.isOffScreen) {
        // @ts-ignore
        this.offscreen = this.canvas.transferControlToOffscreen();
        return;
      } else {
        this.ctx = this.canvas?.getContext('2d', { alpha: true });
      }
    }
    if (this.timeTotalEL) {
      this.timeTotalEL.textContent = ns2s(this._totalNS);
    }
    if (this.timeOffsetEL && this._rangeRuler) {
      this.timeOffsetEL.textContent = ns2UnitS(this._startNS, this._rangeRuler.getScale());
    }
    const width = this.canvas?.clientWidth || 0;
    const height = this.canvas?.clientHeight || 0;
    this.setTimeRuler(width);
    this.setSportRuler(width, height);
    this.setRangeRuler(width);
  }

  private setTimeRuler(width: number): void {
    if (!this.timeRuler) {
      this.timeRuler = new TimeRuler(this, new Rect(0, 0, width, 20), this._totalNS);
    }
    this.timeRuler.frame.width = width;
  }

  private setSportRuler(width: number, height: number): void {
    if (!this._sportRuler) {
      this._sportRuler = new SportRuler(
        this,
        new Rect(0, 100, width, height - 100),
        (hoverFlag, selectFlag) => {
          this.flagChangeHandler?.(hoverFlag, selectFlag);
        },
        (flag) => {
          this.flagClickHandler?.(flag);
        },
        (slicetime) => {
          this.rangeClickHandler?.(slicetime);
        }
      );
    }
    this._sportRuler.frame.width = width;
  }

  private setRangeRuler(width: number): void {
    if (!this._rangeRuler) {
      this._rangeRuler = new RangeRuler(
        this,
        new Rect(0, 25, width, 75 - this._usageFoldHeight),
        {
          slicesTime: {
            startTime: null,
            endTime: null,
            color: null,
          },
          scale: 0,
          startX: 0,
          endX: this.canvas?.clientWidth || 0,
          startNS: 0,
          endNS: this.totalNS,
          totalNS: this.totalNS,
          refresh: true,
          xs: [],
          xsTxt: [],
        },
        (a) => {
          if (a.startNS >= 0 && a.endNS >= 0) {
            if (this._sportRuler) {
              this._sportRuler.range = a;
            }
            if (this.timeOffsetEL && this._rangeRuler) {
              this.timeOffsetEL.textContent = ns2UnitS(a.startNS, this._rangeRuler.getScale());
            }
            if (this.loadComplete) {
              this.rangeChangeHandler?.(a);
            }
          }
        }
      );
    }
    this._rangeRuler.frame.width = width;
  }

  setRangeNS(startNS: number, endNS: number): void {
    info('set startNS values :' + startNS + 'endNS values : ' + endNS);
    this._rangeRuler?.setRangeNS(startNS, endNS);
  }

  getRange(): TimeRange | undefined {
    return this._rangeRuler?.getRange();
  }

  updateWidth(width: number): void {
    this.dpr = window.devicePixelRatio || 1;
    this.canvas!.width = width - (this.totalEL?.clientWidth || 0);
    this.canvas!.height = this.shadowRoot!.host.clientHeight || 0;
    let oldWidth = this.canvas!.width;
    let oldHeight = this.canvas!.height;
    this.canvas!.width = Math.ceil(oldWidth * this.dpr);
    this.canvas!.height = Math.ceil(oldHeight * this.dpr);
    this.canvas!.style.width = oldWidth + 'px';
    this.canvas!.style.height = oldHeight + 'px';
    this.ctx?.scale(this.dpr, this.dpr);
    this.ctx?.translate(0, 0);
    this._rangeRuler!.frame.width = oldWidth;
    this._sportRuler!.frame.width = oldWidth;
    this.timeRuler!.frame.width = oldWidth;
    this._rangeRuler?.fillX();
    this.render();
  }

  documentOnMouseDown = (ev: MouseEvent): void => {
    // @ts-ignore
    if ((window as unknown).isSheetMove) {
      return;
    }
    this._rangeRuler?.mouseDown(ev);
  };

  documentOnMouseUp = (ev: MouseEvent): void => {
    // @ts-ignore
    if ((window as unknown).isSheetMove) {
      return;
    }
    this._rangeRuler?.mouseUp(ev);
    this.sportRuler?.mouseUp(ev);
  };

  documentOnMouseMove = (ev: MouseEvent, trace: SpSystemTrace): void => {
    trace.style.cursor = 'default';
    let x = ev.offsetX - (this.canvas?.offsetLeft || 0); // 鼠标的x轴坐标
    let y = ev.offsetY; // 鼠标的y轴坐标
    let findSlicestime = this.sportRuler?.findSlicesTime(x, y); // 查找帽子
    if (!findSlicestime) {
      // 如果在该位置没有找到一个“帽子”，则可以显示一个旗子。
      this.sportRuler?.showHoverFlag();
      this._rangeRuler?.mouseMove(ev, trace);
      if (this.sportRuler?.edgeDetection(ev)) {
        this.sportRuler?.mouseMove(ev);
      } else {
        this.sportRuler?.mouseOut(ev);
      }
    } else {
      this.sportRuler?.clearHoverFlag();
      this.sportRuler?.modifyFlagList(null); //重新绘制旗子，清除hover flag
    }
  };

  documentOnMouseOut = (ev: MouseEvent): void => {
    this._rangeRuler?.mouseOut(ev);
    this.sportRuler?.mouseOut(ev);
  };

  documentOnKeyPress = (ev: KeyboardEvent, currentSlicesTime?: CurrentSlicesTime): void => {
    // @ts-ignore
    if ((window as unknown).flagInputFocus) {
      return;
    }
    this._rangeRuler?.keyPress(ev, currentSlicesTime);
    this.sportRuler?.clearHoverFlag();
  };

  documentOnKeyUp = (ev: KeyboardEvent): void => {
    // @ts-ignore
    if ((window as unknown).flagInputFocus) {
      return;
    }
    this._rangeRuler?.keyUp(ev);
  };

  disconnectedCallback(): void {}

  firstRender = true;

  lineColor(): string {
    return window.getComputedStyle(this.canvas!, null).getPropertyValue('color');
  }

  render(): void {
    this.dpr = window.devicePixelRatio || 1;
    if (this.ctx) {
      this.ctx.fillStyle = 'transparent';
      this.ctx?.fillRect(0, 0, this.canvas?.width || 0, this.canvas?.height || 0);
      this.timeRuler?.draw();
      this._rangeRuler?.draw();
      this._sportRuler?.draw();
    } else {
      procedurePool.submitWithName(
        'timeline',
        'timeline',
        {
          offscreen: this.must ? this.offscreen : undefined, //是否离屏
          dpr: this.dpr, //屏幕dpr值
          hoverX: this.hoverX,
          hoverY: this.hoverY,
          canvasWidth: this.canvasWidth,
          canvasHeight: this.canvasHeight,
          keyPressCode: null,
          keyUpCode: null,
          lineColor: '#dadada',
          startNS: this.startNS,
          endNS: this.endNS,
          totalNS: this.totalNS,
          frame: this.frame,
        },
        this.must ? this.offscreen : undefined,
        (res: unknown) => {
          this.must = false;
        }
      );
    }
  }

  modifyFlagList(flag: Flag | null | undefined): void {
    this._sportRuler?.modifyFlagList(flag);
  }

  modifySlicesList(slicestime: SlicesTime | null | undefined): void {
    this._sportRuler?.modifySicesTimeList(slicestime);
  }
  cancelPressFrame(): void {
    this._rangeRuler?.cancelPressFrame();
  }

  cancelUpFrame(): void {
    this._rangeRuler?.cancelUpFrame();
  }

  stopWASD(ev: unknown): void {
    // @ts-ignore
    this._rangeRuler?.keyUp(ev);
  }

  drawTriangle(time: number, type: string): unknown {
    return this._sportRuler?.drawTriangle(time, type);
  }

  removeTriangle(type: string): void {
    this._sportRuler?.removeTriangle(type);
  }

  setSlicesMark(
    startTime: null | number = null,
    endTime: null | number = null,
    shiftKey: null | boolean = false
  ): SlicesTime | null | undefined {
    let sliceTime = this._sportRuler?.setSlicesMark(startTime, endTime, shiftKey);
    if (sliceTime && sliceTime !== undefined) {
      this.traceSheetEL?.displayCurrent(sliceTime); // 给当前pane准备数据

      // 取最新创建的那个selection对象
      let selection = this.selectionList[this.selectionList.length - 1];
      if (selection) {
        selection.isCurrentPane = true; // 设置当前面板为可以显示的状态
        //把刚刚创建的slicetime和selection对象关联起来，以便后面再次选中“跑道”的时候显示对应的面板。
        this.selectionMap.set(sliceTime.id, selection);
        this.traceSheetEL?.rangeSelect(selection); // 显示选中区域对应的面板
      }
    }
    return sliceTime;
  }

  displayCollect(showCollect: boolean): void {
    if (showCollect) {
      this.collecBtn!.style.display = 'flex';
    } else {
      this.collecBtn!.style.display = 'none';
    }
  }

  initHtml(): string {
    return TimerShaftElementHtml;
  }
}
export class SpQuerySQL extends BaseElement {
    private queryTableEl: LitTable | undefined;
    private notSupportList: Array<string> | undefined = [];
    private querySize: HTMLElement | undefined;
    private keyList: Array<string> | undefined;
    private selector: HTMLTextAreaElement | undefined;
    private isSupportSql: boolean = true;
    private response: HTMLDivElement | undefined;
    private statDataArray: unknown[] = [];
    private sliceData: unknown[] = [];
    private querySqlErrorText: string = '';
    private progressLoad: LitProgressBar | undefined;
    private pagination: PaginationBox | undefined;
    private sqlListDiv: HTMLDivElement | undefined;
  
    initElements(): void {
      this.progressLoad = this.shadowRoot?.querySelector('.load-query-sql') as LitProgressBar;
      this.selector = this.shadowRoot?.querySelector('.sql-select') as HTMLTextAreaElement;
      this.queryTableEl = this.shadowRoot?.querySelector('lit-table') as LitTable;
      this.queryTableEl.setAttribute('data-query-scene', '');
      this.querySize = this.shadowRoot?.querySelector('.query_size') as HTMLElement;
      this.response = this.shadowRoot?.querySelector('#dataResult') as HTMLDivElement;
      this.pagination = this.shadowRoot?.querySelector('.pagination-box') as PaginationBox;
      this.notSupportList?.push('insert', 'delete', 'update', 'drop', 'alter', 'truncate', 'create');
      this.sqlListDiv = this.shadowRoot?.querySelector('#sqlList') as HTMLDivElement;
      let htmlDivElement = this.queryTableEl.shadowRoot?.querySelector('.table') as HTMLDivElement;
      htmlDivElement.style.overflowX = 'scroll';
      window.addEventListener('resize', () => {
        this.freshTableHeadResizeStyle();
      });
      let copyButtonEl = this.shadowRoot?.querySelector('#copy-button') as HTMLButtonElement;
      copyButtonEl.addEventListener('click', () => {
        this.copyTableData();
      });
      let closeButtonEl = this.shadowRoot?.querySelector('#close-button') as HTMLButtonElement;
      closeButtonEl.addEventListener('click', () => {
        this.pagination!.style.display = 'none';
        this.querySize!.textContent = 'Query result - 0 counts.';
        this.queryTableEl!.dataSource = [];
        this.response!.innerHTML = '';
      });
      this.initCommonList();
    }
  
    private initCommonList(): void {
      let commonSqlList = getAllSql();
      if (commonSqlList.length > 0) {
        for (let i = 0; i < commonSqlList.length; i++) {
          let commonSqlDiv = document.createElement('div');
          commonSqlDiv.className = 'sql-item';
          let sql = document.createElement('div');
          sql.className = 'sql';
          sql.textContent = commonSqlList[i].sql;
          let runButton = document.createElement('lit-icon');
          runButton.className = 'runButton';
          runButton.title = commonSqlList[i].title;
          runButton.setAttribute('size', '20');
          runButton.setAttribute('name', 'run-sql');
          commonSqlDiv.appendChild(sql);
          commonSqlDiv.appendChild(runButton);
          this.sqlListDiv?.append(commonSqlDiv);
        }
      }
    }
  
    private freshTableHeadResizeStyle(): void {
      let th = this.queryTableEl!.shadowRoot?.querySelector<HTMLDivElement>('.th');
      if (th) {
        let td = th.querySelectorAll<HTMLDivElement>('.td');
        let firstChild = this.queryTableEl!.shadowRoot?.querySelector<HTMLDivElement>('.body')!.firstElementChild;
        if (firstChild) {
          let bodyList = firstChild.querySelectorAll<HTMLDivElement>('.td');
          for (let index = 0; index < bodyList.length; index++) {
            td[index].style.width = `${bodyList[index].offsetWidth}px`;
            td[index].style.overflow = 'hidden';
          }
        }
      }
      let tableHeadStyle: HTMLDivElement | undefined | null = this.queryTableEl?.shadowRoot?.querySelector(
        'div.th'
      ) as HTMLDivElement;
      if (tableHeadStyle && tableHeadStyle.hasChildNodes()) {
        for (let index = 0; index < tableHeadStyle.children.length; index++) {
          // @ts-ignore
          tableHeadStyle.children[index].style.gridArea = null;
        }
      }
      this.queryTableEl!.style.height = '100%';
    }
  
    private async copyTableData(): Promise<void> {
      let copyResult = '';
      for (let keyListKey of this.keyList!) {
        copyResult += `${keyListKey}\t`;
      }
      copyResult += '\n';
      let copyData: unknown[];
      if (this.statDataArray.length > maxPageSize) {
        copyData = this.sliceData;
      } else {
        copyData = this.statDataArray;
      }
      for (const value of copyData) {
        this.keyList?.forEach((key) => {
          // @ts-ignore
          copyResult += `${value[key]}\t`;
        });
        copyResult += '\n';
      }
      await navigator.clipboard.writeText(copyResult);
    }
  
    selectEventListener = (event: KeyboardEvent): void => {
      let enterKey = 13;
      if (event.ctrlKey && event.keyCode === enterKey) {
        SpStatisticsHttpUtil.addOrdinaryVisitAction({
          event: 'query',
          action: 'query',
        });
        this.statDataArray = [];
        this.keyList = [];
        this.response!.innerHTML = '';
        this.queryTableEl!.innerHTML = '';
        this.pagination!.style.display = 'none';
        if (this.isSupportSql) {
          this.executeSql(this.selector!.value);
        } else {
          this.querySize!.textContent = this.querySqlErrorText;
          this.queryTableEl!.dataSource = [];
          this.response!.innerHTML = '';
          return;
        }
      }
    };
  
    private executeSql(sql: string): void {
      this.progressLoad!.loading = true;
      if (this.querySize) {
        this.querySize!.title = `${sql}`;
      }
      queryCustomizeSelect(sql).then((resultList): void => {
        if (resultList && resultList.length > 0) {
          this.statDataArray = resultList;
          //@ts-ignore
          this.keyList = Object.keys(resultList[0]);
          this.querySize!.textContent = `Query result - ${this.statDataArray.length} counts.` + `(${sql})`;
          this.initDataElement();
          this.response!.appendChild(this.queryTableEl!);
          this.setPageNationTableEl();
          setTimeout(() => {
            if (this.parentElement?.clientHeight !== 0) {
              this.queryTableEl!.style.height = '100%';
              this.queryTableEl!.reMeauseHeight();
            }
          }, 300);
        } else {
          this.querySize!.textContent = `Query result - ${this.statDataArray.length} counts.` + `(${sql})`;
          this.progressLoad!.loading = false;
        }
      });
    }
  
    private setPageNationTableEl(): void {
      let timeOutTs: number = 200;
      let indexNumber = 1;
      setTimeout(() => {
        let total = this.statDataArray.length;
        if (total > maxPageSize) {
          this.pagination!.style.display = 'block';
          this.pagination!.style.opacity = '1';
          const option = {
            current: 1,
            total: total,
            pageSize: pageSize,
            change: (num: number): void => {
              this.sliceData = this.statDataArray!.slice((num - indexNumber) * pageSize, num * pageSize);
              this.queryTableEl!.recycleDataSource = this.sliceData;
            },
          };
          new PageNation(this.pagination, option);
        } else {
          this.pagination!.style.opacity = '0';
          this.queryTableEl!.recycleDataSource = this.statDataArray;
        }
        this.freshTableHeadResizeStyle();
        this.progressLoad!.loading = false;
      }, timeOutTs);
    }