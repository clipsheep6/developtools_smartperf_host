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

import { SpSystemTrace } from '../SpSystemTrace';
import { SpHiPerf } from './SpHiPerf';
import { SpCpuChart } from './SpCpuChart';
import { SpFreqChart } from './SpFreqChart';
import { SpFpsChart } from './SpFpsChart';
import { info } from '../../../log/Log';
import { SpNativeMemoryChart } from './SpNativeMemoryChart';
import { SpAbilityMonitorChart } from './SpAbilityMonitorChart';
import { SpProcessChart } from './SpProcessChart';
import { perfDataQuery } from './PerfDataQuery';
import { SpVirtualMemChart } from './SpVirtualMemChart';
import { SpEBPFChart } from './SpEBPFChart';
import { SpSdkChart } from './SpSdkChart';
import { SpHiSysEnergyChart } from './SpHiSysEnergyChart';
import { VmTrackerChart } from './SpVmTrackerChart';
import { SpClockChart } from './SpClockChart';
import { SpIrqChart } from './SpIrqChart';
import { renders } from '../../database/ui-worker/ProcedureWorker';
import { EmptyRender } from '../../database/ui-worker/cpu/ProcedureWorkerCPU';
import { TraceRow } from '../trace/base/TraceRow';
import { SpFrameTimeChart } from './SpFrameTimeChart';
import { Utils } from '../trace/base/Utils';
import { SpArkTsChart } from './SpArkTsChart';
import { MemoryConfig } from '../../bean/MemoryConfig';
import { FlagsConfig } from '../SpFlags';
import { SpLogChart } from './SpLogChart';
import { SpHiSysEventChart } from './SpHiSysEventChart';
import { SpAllAppStartupsChart } from './SpAllAppStartups';
import { procedurePool } from '../../database/Procedure';
import { SpSegmentationChart } from './SpSegmentationChart';
import { SpPerfOutputDataChart } from './SpPerfOutputDataChart';
import {
  queryAppStartupProcessIds,
  queryDataDICT,
  queryThreadAndProcessName,
} from '../../database/sql/ProcessThread.sql';
import { queryTaskPoolCallStack, queryTotalTime } from '../../database/sql/SqlLite.sql';
import { queryMemoryConfig } from '../../database/sql/Memory.sql';
import { SpLtpoChart } from './SpLTPO';
import { SpBpftraceChart } from './SpBpftraceChart';
import { sliceSender } from '../../database/data-trafic/SliceSender';
import { BaseStruct } from '../../bean/BaseStruct';
import { SpGpuCounterChart } from './SpGpuCounterChart';
import { SpUserFileChart } from './SpUserPluginChart'
import { SpImportFileChart } from './SpImportMateChart'
import { queryDmaFenceIdAndCat } from '../../database/sql/dmaFence.sql';
import { queryAllFuncNames } from '../../database/sql/Func.sql';

export class SpChartManager {
  static APP_STARTUP_PID_ARR: Array<number> = [];

  private trace: SpSystemTrace;
  public perf: SpHiPerf;
  private cpu: SpCpuChart;
  private freq: SpFreqChart;
  private virtualMemChart: SpVirtualMemChart;
  private fps: SpFpsChart;
  private nativeMemory: SpNativeMemoryChart;
  private abilityMonitor: SpAbilityMonitorChart;
  private process: SpProcessChart;
  private process2?: SpProcessChart;
  private fileSystem: SpEBPFChart;
  private sdkChart: SpSdkChart;
  private hiSyseventChart: SpHiSysEnergyChart;
  private smapsChart: VmTrackerChart;
  private clockChart: SpClockChart;
  private irqChart: SpIrqChart;
  private spAllAppStartupsChart!: SpAllAppStartupsChart;
  private SpLtpoChart!: SpLtpoChart;
  frameTimeChart: SpFrameTimeChart;
  public arkTsChart: SpArkTsChart;
  private logChart: SpLogChart;
  private spHiSysEvent: SpHiSysEventChart;
  private spSegmentationChart: SpSegmentationChart;
  private spBpftraceChart: SpBpftraceChart;
  private spPerfOutputDataChart: SpPerfOutputDataChart;
  private spGpuCounterChart: SpGpuCounterChart;
  private spUserFileChart: SpUserFileChart;
  private spImportFileChart: SpImportFileChart;

  constructor(trace: SpSystemTrace) {
    this.trace = trace;
    this.perf = new SpHiPerf(trace);
    this.fileSystem = new SpEBPFChart(trace);
    this.cpu = new SpCpuChart(trace);
    this.freq = new SpFreqChart(trace);
    this.virtualMemChart = new SpVirtualMemChart(trace);
    this.fps = new SpFpsChart(trace);
    this.nativeMemory = new SpNativeMemoryChart(trace);
    this.abilityMonitor = new SpAbilityMonitorChart(trace);
    this.process = new SpProcessChart(trace);
    this.sdkChart = new SpSdkChart(trace);
    this.hiSyseventChart = new SpHiSysEnergyChart(trace);
    this.smapsChart = new VmTrackerChart(trace);
    this.clockChart = new SpClockChart(trace);
    this.irqChart = new SpIrqChart(trace);
    this.frameTimeChart = new SpFrameTimeChart(trace);
    this.arkTsChart = new SpArkTsChart(trace);
    this.logChart = new SpLogChart(trace);
    this.spHiSysEvent = new SpHiSysEventChart(trace);
    this.spAllAppStartupsChart = new SpAllAppStartupsChart(trace);
    this.SpLtpoChart = new SpLtpoChart(trace);
    this.spSegmentationChart = new SpSegmentationChart(trace);
    this.spBpftraceChart = new SpBpftraceChart(trace);
    this.spPerfOutputDataChart = new SpPerfOutputDataChart(trace);
    this.spGpuCounterChart = new SpGpuCounterChart(trace);
    this.spUserFileChart = new SpUserFileChart(trace);
    this.spImportFileChart = new SpImportFileChart(trace);
  }
  async initPreprocessData(progress: Function): Promise<void> {
    progress('load data dict', 50);
    this.process2 = undefined;
    SpSystemTrace.DATA_DICT.clear();
    SpChartManager.APP_STARTUP_PID_ARR = [];
    let dict = await queryDataDICT();
    if (FlagsConfig.getFlagsConfigEnableStatus('AppStartup')) {
      let appStartUpPids = await queryAppStartupProcessIds();
      appStartUpPids.forEach((it) => SpChartManager.APP_STARTUP_PID_ARR.push(it.pid));
    }
    await this.initTraceConfig(); //@ts-ignore
    dict.map((d) => SpSystemTrace.DATA_DICT.set(d.id, d.data));
    await this.cacheDataDictToWorker();
    SpSystemTrace.DATA_TASK_POOL_CALLSTACK.clear();
    let taskPoolCallStack = await queryTaskPoolCallStack();
    taskPoolCallStack.map((d) => SpSystemTrace.DATA_TASK_POOL_CALLSTACK.set(d.id, d));
    progress('time range', 65);
    await this.initTotalTime();
    let ptArr = await queryThreadAndProcessName(); //@ts-ignore
    this.handleProcessThread(ptArr);
    info('initData timerShaftEL Data initialized');
    let funArr = await queryAllFuncNames();
    this.handleFuncName(funArr);
  }

  async initCpu(progress: Function): Promise<void> {
    progress('cpu', 70);
    let result = await sliceSender();
    // @ts-ignore
    SpProcessChart.threadStateList = result.threadMap;
    // @ts-ignore
    SpProcessChart.processRowSortMap = result.processRowSortMap;
    //@ts-ignore
    await this.cpu.init(result.count.cpu);
    info('initData cpu Data initialized');
    if (FlagsConfig.getFlagsConfigEnableStatus('Bpftrace')) {
      await this.spBpftraceChart.init(null);
    }
    if (FlagsConfig.getFlagsConfigEnableStatus('UserPluginsRow')) {
      await this.spUserFileChart.init(null)
    }
    await this.spImportFileChart.init(null)
    if (FlagsConfig.getFlagsConfigEnableStatus('GpuCounter')) {
      await this.spGpuCounterChart.init([]);
    }
    if (FlagsConfig.getFlagsConfigEnableStatus('SchedulingAnalysis')) {
      await this.cpu.initCpuIdle0Data(progress);
      await this.cpu.initSchedulingPTData(progress);
      await this.cpu.initSchedulingFreqData(progress);
    }
    info('initData ProcessThreadState Data initialized');
    progress('cpu rate', 75);
    //@ts-ignore
    await this.initCpuRate(result.cpuUtiliRateArray);
    info('initData Cpu Rate Data initialized');
    progress('cpu freq', 80);
    await this.freq.init();
    info('initData Cpu Freq Data initialized');
  }

  async init(progress: Function): Promise<void> {
    info('initData data parse end ');
    await this.initPreprocessData(progress);
    await this.initCpu(progress);
    await this.logChart.init();
    await this.spHiSysEvent.init();
    let idAndNameArr = await queryDmaFenceIdAndCat();
    this.handleDmaFenceName(idAndNameArr as { id: number; cat: string; seqno: number; driver: string; context: string }[]);
    progress('Clock init', 82);
    await this.clockChart.init();
    progress('Irq init', 84);
    await this.irqChart.init();
    progress('SpSegmentationChart inin', 84.5);
    await this.spSegmentationChart.init();
    await this.virtualMemChart.init();
    progress('fps', 85);
    await this.fps.init();
    progress('native memory', 87);
    await this.nativeMemory.initChart();
    progress('ability monitor', 88);
    await this.abilityMonitor.init();
    progress('hiSysevent', 88.2);
    await this.hiSyseventChart.init();
    progress('vm tracker', 88.4);
    await this.smapsChart.init();
    progress('sdk', 88.6);
    await this.sdkChart.init();
    progress('perf', 88.8);
    await this.perf!.init();
    await perfDataQuery.initPerfCache();
    progress('file system', 89);
    await this.fileSystem!.init();
    progress('ark ts', 90);
    await this.arkTsChart.initFolder();
    await this.spAllAppStartupsChart.init();
    await this.SpLtpoChart.init();
    await this.frameTimeChart.init();
    await this.spPerfOutputDataChart.init();
    progress('process', 92);
    this.process.clearCache();
    this.process2?.clearCache();
    this.process2 = undefined;
    await this.process.initAsyncFuncData({
      startTs: Utils.getInstance().getRecordStartNS(),
      endTs: Utils.getInstance().getRecordEndNS(),
    });
    await this.process.initDeliverInputEvent();
    await this.process.initTouchEventDispatch();
    await this.process.init(false);
    progress('display', 95);
  }

  async initDistributedChart(progress: Function, file1: string, file2: string): Promise<void> {
    let funArr1 = await queryAllFuncNames('1');
    let funArr2 = await queryAllFuncNames('2');
    this.handleFuncName(funArr1, '1');
    this.handleFuncName(funArr2, '2');
    progress('load data dict', 50);
    SpSystemTrace.DATA_DICT.clear();
    SpChartManager.APP_STARTUP_PID_ARR = [];
    SpSystemTrace.DATA_TASK_POOL_CALLSTACK.clear();
    this.process.clearCache();
    this.process2?.clearCache();
    let trace1Folder = this.createFolderRow('trace-1', 'trace-1', file1);
    let trace2Folder = this.createFolderRow('trace-2', 'trace-2', file2);
    this.trace.rowsEL!.appendChild(trace1Folder);
    this.trace.rowsEL!.appendChild(trace2Folder);
    await this.initTotalTime(true);
    await this.initDistributedTraceRow('1', trace1Folder, progress);
    info(`trace 1 load completed`);
    await this.initDistributedTraceRow('2', trace2Folder, progress);
    info(`trace 2 load completed`);
  }

  // @ts-ignore
  async initDistributedTraceRow(traceId: string, traceFolder: TraceRow<unknown>, progress: Function): Promise<void> {
    let ptArr = await queryThreadAndProcessName(traceId);
    // @ts-ignore
    this.handleProcessThread(ptArr, traceId);
    info(`initData trace ${traceId} timerShaftEL Data initialized`);
    progress(`trace ${traceId} cpu`, 70);
    let count = await sliceSender(traceId);
    // @ts-ignore
    await this.cpu.init(count.cpu, traceFolder, traceId);
    info(`initData trace ${traceId} cpu Data initialized`);
    progress(`trace ${traceId} cpu freq`, 75);
    // @ts-ignore
    await this.freq.init(traceFolder, traceId);
    info(`initData trace ${traceId} cpu freq Data initialized`);
    progress(`trace ${traceId} clock`, 80);
    // @ts-ignore
    await this.clockChart.init(traceFolder, traceId);
    info(`initData trace ${traceId} clock Data initialized`);
    progress(`trace ${traceId} Irq`, 85);
    // @ts-ignore
    await this.irqChart.init(traceFolder, traceId);
    info(`initData trace ${traceId} irq Data initialized`);
    progress(`trace ${traceId} process`, 92);
    if (traceId === '2') {
      if (!this.process2) {
        this.process2 = new SpProcessChart(this.trace);
      }
      await this.process2.initAsyncFuncData(
        {
          startTs: Utils.getInstance().getRecordStartNS('2'),
          endTs: Utils.getInstance().getRecordEndNS('2'),
        },
        traceId
      );
      await this.process2.init(true, traceFolder, traceId);
    } else {
      await this.process.initAsyncFuncData(
        {
          startTs: Utils.getInstance().getRecordStartNS('1'),
          endTs: Utils.getInstance().getRecordEndNS('1'),
        },
        traceId
      );
      await this.process.init(true, traceFolder, traceId);
    }
  }

  async initSample(ev: File) {
    await this.initSampleTime(ev, 'bpftrace');
    await this.spBpftraceChart.init(ev);
  }

  async initGpuCounter(ev: File): Promise<void> {
    const res = await this.initSampleTime(ev, 'gpucounter');
    //@ts-ignore
    await this.spGpuCounterChart.init(res);
  }

  async importSoFileUpdate(): Promise<void> {
    SpSystemTrace.DATA_DICT.clear();
    let dict = await queryDataDICT(); //@ts-ignore
    dict.map((d) => SpSystemTrace.DATA_DICT.set(d.id, d.data));
    await this.cacheDataDictToWorker();
    await perfDataQuery.initPerfCache();
    await this.nativeMemory.initNativeMemory();
    await this.fileSystem.initFileCallchain();
    this.perf.resetAllChartData();
  }

  handleProcessThread(arr: { id: number; name: string; type: string }[], traceId?: string): void {
    Utils.getInstance().getProcessMap(traceId).clear();
    Utils.getInstance().getThreadMap(traceId).clear();
    for (let pt of arr) {
      if (pt.type === 'p') {
        Utils.getInstance().getProcessMap(traceId).set(pt.id, pt.name);
      } else {
        Utils.getInstance().getThreadMap(traceId).set(pt.id, pt.name);
      }
    }
  }

  // 将callstatck表信息转为map存入utils
  handleFuncName(funcNameArray: Array<unknown>, traceId?: string): void {
    if (traceId) {
      funcNameArray.forEach((it) => {
        //@ts-ignore
        Utils.getInstance().getCallStatckMap().set(`${traceId}_${it.id!}`, it.name);
      });
    } else {
      funcNameArray.forEach((it) => {
        //@ts-ignore
        Utils.getInstance().getCallStatckMap().set(it.id, it.name);
      });
    }
  }

  initTotalTime = async (isDistributed: boolean = false): Promise<void> => {
    let res1 = await queryTotalTime('1');
    let total = res1[0].total;
    Utils.getInstance().trace1RecordStartNS = res1[0].recordStartNS;
    Utils.getInstance().trace1RecordEndNS = Math.max(res1[0].recordEndNS, res1[0].recordStartNS + 1);
    if (isDistributed) {
      let res2 = await queryTotalTime('2');
      total = Math.max(total, res2[0].total);
      Utils.getInstance().trace2RecordStartNS = res2[0].recordStartNS;
      Utils.getInstance().trace2RecordEndNS = Math.max(res2[0].recordEndNS, res2[0].recordStartNS + 1);
    }
    if (this.trace.timerShaftEL) {
      if (total === 0) {
        total = 1;
      }
      Utils.getInstance().totalNS = total;
      this.trace.timerShaftEL.totalNS = total;
      this.trace.timerShaftEL.getRangeRuler()!.drawMark = true;
      this.trace.timerShaftEL.setRangeNS(0, total);
      window.recordStartNS = Utils.getInstance().trace1RecordStartNS;
      window.recordEndNS = Utils.getInstance().trace1RecordEndNS;
      window.totalNS = total;
      this.trace.timerShaftEL.loadComplete = true;
    }
  };

  initSampleTime = async (ev: File, type: string): Promise<unknown> => {
    let res;
    let endNS = 30_000_000_000;
    if (type === 'gpucounter') {
      res = await this.spGpuCounterChart.getCsvData(ev);
      // @ts-ignore
      const endTime = Number(res[res.length - 1].split(',')[0]);
      // @ts-ignore
      const minIndex = this.spGpuCounterChart.getMinData(res) + 1;
      // @ts-ignore
      const startTime = Number(res[minIndex].split(',')[0]);
      endNS = Number((endTime - startTime).toString().slice(0, 11));
    }
    if (this.trace.timerShaftEL) {
      let total = endNS;
      let startNS = 0;
      this.trace.timerShaftEL.totalNS = total;
      this.trace.timerShaftEL.getRangeRuler()!.drawMark = true;
      this.trace.timerShaftEL.setRangeNS(0, total); // @ts-ignore
      (window as unknown).recordStartNS = startNS; // @ts-ignore
      (window as unknown).recordEndNS = endNS; // @ts-ignore
      (window as unknown).totalNS = total;
      this.trace.timerShaftEL.loadComplete = true;
    }
    return res;
  };

  initCpuRate = async (rates: Array<{ cpu: number; ro: number; rate: number; }>): Promise<void> => {
    if (this.trace.timerShaftEL) {
      this.trace.timerShaftEL.cpuUsage = rates;
    }
    info('Cpu UtilizationRate data size is: ', rates.length);
  };

  initTraceConfig = async (): Promise<void> => {
    queryMemoryConfig().then((result) => {
      if (result && result.length > 0) {
        const config = result[0];
        MemoryConfig.getInstance().updateConfig(config.pid, config.iPid, config.processName, config.interval);
      }
    });
  };

  async cacheDataDictToWorker(): Promise<void> {
    return new Promise((resolve) => {
      procedurePool.submitWithName(
        'logic0',
        'cache-data-dict',
        { dataDict: SpSystemTrace.DATA_DICT },
        undefined,
        (res: unknown): void => {
          resolve();
        }
      );
    });
  }

  // @ts-ignore
  createFolderRow(rowId: string, rowType: string, rowName: string, traceId?: string): TraceRow<unknown> {
    let row = TraceRow.skeleton<BaseStruct>(traceId);
    row.setAttribute('disabled-check', '');
    row.rowId = rowId;
    row.rowType = rowType;
    row.rowParentId = '';
    row.folder = true;
    row.style.height = '40px';
    row.name = rowName;
    // @ts-ignore
    row.supplier = folderSupplier();
    row.onThreadHandler = folderThreadHandler(row, this.trace);
    row.addEventListener('expansion-change', (evt) => {
      if (!row.expansion) {
        this.trace.clickEmptyArea();
      }
    });
    return row;
  }

  //存名字
  handleDmaFenceName<T extends { id: number; cat: string; seqno: number; driver: string; context: string }>(arr: T[]): void {
    Utils.DMAFENCECAT_MAP.clear();
    for (let item of arr) {
      Utils.DMAFENCECAT_MAP.set(item.id, item);
    }
  }
}

export const folderSupplier = (): () => Promise<BaseStruct[]> => {
  return () => new Promise<Array<BaseStruct>>((resolve) => resolve([]));
};

export const folderThreadHandler = (row: TraceRow<BaseStruct>, trace: SpSystemTrace) => {
  return (useCache: boolean): void => {
    row.canvasSave(trace.canvasPanelCtx!);
    if (row.expansion) {
      // @ts-ignore
      trace.canvasPanelCtx?.clearRect(0, 0, row.frame.width, row.frame.height);
    } else {
      (renders.empty as EmptyRender).renderMainThread(
        {
          context: trace.canvasPanelCtx,
          useCache: useCache,
          type: '',
        },
        row
      );
    }
    row.canvasRestore(trace.canvasPanelCtx!, trace);
  };
};

export function rowThreadHandler<T>(
  tag: string,
  contextField: string,
  arg: unknown, // @ts-ignore
  row: TraceRow<unknown>,
  trace: SpSystemTrace
) {
  return (useCache: boolean): void => {
    let context: CanvasRenderingContext2D = getRowContext(row, trace);
    row.canvasSave(context); // @ts-ignore
    arg.useCache = useCache;
    if (contextField) {
      // @ts-ignore
      arg[contextField] = context;
    } // @ts-ignore
    (renders[tag] as unknown).renderMainThread(arg, row);
    row.canvasRestore(context, trace);
  };
}
// @ts-ignore
export const getRowContext = (row: TraceRow<unknown>, trace: SpSystemTrace): CanvasRenderingContext2D => {
  if (row.currentContext) {
    return row.currentContext;
  } else {
    return row.collect ? trace.canvasFavoritePanelCtx! : trace.canvasPanelCtx!;
  }
};
/*
 * Copyright (C) 2024 Huawei Device Co., Ltd.
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

import { type CpuFreqData, type RunningFreqData, type RunningData } from '../component/trace/sheet/frequsage/TabPaneFreqUsageConfig';

let comPower = new Map<number, Map<number, unknown>>();
let resultArray: Array<RunningFreqData> = [];
let timeZones: number = 0;
let maxCommpuPower: number = 0;

/**
 *
 * @param args.runData 数据库查询上来的running数据，此函数会将数据整理成map结构，分组规则：'pid_tid'为键，running数据数字为值
 * @returns 返回map对象及所有running数据的dur和，后续会依此计算百分比
 */
function orgnazitionMap(
  args: {
    runData: Array<RunningData>;
    cpuFreqData: Array<CpuFreqData>;
    leftNs: number;
    rightNs: number;
    cpuArray: number[];
  }
): Array<RunningFreqData> {
  let result: Map<string, Array<RunningData>> = new Map();
  let sum: number = 0;
  // 循环分组
  for (let i = 0; i < args.runData.length; i++) {
    let mapKey: string = args.runData[i].pid + '_' + args.runData[i].tid;
    // 该running数据若在map对象中不包含其'pid_tid'构成的键，则新加key-value值
    if (!result.has(mapKey)) {
      result.set(mapKey, new Array());
    }
    // 整理左右边界数据问题, 因为涉及多线程，所以必须放在循环里
    if (
      args.runData[i].ts < args.leftNs &&
      args.runData[i].ts + args.runData[i].dur > args.leftNs
    ) {
      args.runData[i].dur = args.runData[i].ts + args.runData[i].dur - args.leftNs;
      args.runData[i].ts = args.leftNs;
    }
    if (args.runData[i].ts + args.runData[i].dur > args.rightNs) {
      args.runData[i].dur = args.rightNs - args.runData[i].ts;
    }
    // 特殊处理数据表中dur为负值的情况
    if (args.runData[i].dur < 0) {
      args.runData[i].dur = 0;
    }
    // 分组整理数据
    result.get(mapKey)?.push({
      pid: args.runData[i].pid,
      tid: args.runData[i].tid,
      cpu: args.runData[i].cpu,
      dur: args.runData[i].dur,
      ts: args.runData[i].ts,
    });
    sum += args.runData[i].dur;
  }
  return dealCpuFreqData(args.cpuFreqData, result, sum, args.cpuArray);
}

/**
 *
 * @param cpuFreqData cpu频点数据的数组
 * @param result running数据的map对象
 * @param sum running数据的时间和
 * @returns 返回cpu频点数据map，'pid_tid'为键，频点算力值数据的数组为值
 */
function dealCpuFreqData(
  cpuFreqData: Array<CpuFreqData>,
  result: Map<string, Array<RunningData>>,
  sum: number,
  cpuList: number[]
): Array<RunningFreqData> {
  let runningFreqData: Map<string, Array<RunningFreqData>> = new Map();
  result.forEach((item, key) => {
    let resultList: Array<RunningFreqData> = new Array();
    for (let i = 0; i < item.length; i++) {
      for (let j = 0; j < cpuFreqData.length; j++) {
        let flag: number;
        if (item[i].cpu === cpuFreqData[j].cpu) {
          // 当running状态数据的开始时间大于频点数据开始时间,小于频点结束时间。且running数据的持续时间小于频点结束时间减去running数据开始时间的差值的情况
          if (
            item[i].ts > cpuFreqData[j].ts &&
            item[i].ts < cpuFreqData[j].ts + cpuFreqData[j].dur &&
            item[i].dur < cpuFreqData[j].ts + cpuFreqData[j].dur - item[i].ts
          ) {
            resultList.push(returnObj(item[i], cpuFreqData[j], sum, (flag = 1))!);
            item.splice(i, 1);
            i--;
            break;
          }
          if (
            item[i].ts > cpuFreqData[j].ts &&
            item[i].ts < cpuFreqData[j].ts + cpuFreqData[j].dur &&
            item[i].dur >= cpuFreqData[j].ts + cpuFreqData[j].dur - item[i].ts
          ) {
            // 当running状态数据的开始时间大于频点数据开始时间,小于频点结束时间。且running数据的持续时间大于等于频点结束时间减去running数据开始时间的差值的情况
            resultList.push(returnObj(item[i], cpuFreqData[j], sum, (flag = 2))!);
          }
          // 当running状态数据的开始时间小于等于频点数据开始时间,结束时间大于频点开始时间。且running数据的持续时间减去频点数据开始时间的差值小于频点数据持续时间的情况
          if (
            item[i].ts <= cpuFreqData[j].ts &&
            item[i].ts + item[i].dur > cpuFreqData[j].ts &&
            item[i].dur + item[i].ts - cpuFreqData[j].ts < cpuFreqData[j].dur
          ) {
            resultList.push(returnObj(item[i], cpuFreqData[j], sum, (flag = 3))!);
            item.splice(i, 1);
            i--;
            break;
          }
          if (
            item[i].ts <= cpuFreqData[j].ts &&
            item[i].ts + item[i].dur > cpuFreqData[j].ts &&
            item[i].dur + item[i].ts - cpuFreqData[j].ts >= cpuFreqData[j].dur
          ) {
            // 当running状态数据的开始时间小于等于频点数据开始时间,结束时间大于频点开始时间。且running数据的持续时间减去频点数据开始时间的差值大于等于频点数据持续时间的情况
            resultList.push(returnObj(item[i], cpuFreqData[j], sum, (flag = 4))!);
          }
          if (
            item[i].ts <= cpuFreqData[j].ts &&
            item[i].ts + item[i].dur <= cpuFreqData[j].ts
          ) {
            // 当running状态数据的开始时间小于等于频点数据开始时间,结束时间小于等于频点开始时间的情况
            resultList.push(returnObj(item[i], cpuFreqData[j], sum, (flag = 5))!);
            item.splice(i, 1);
            i--;
            break;
          }
        } else {
          if (!cpuList.includes(item[i].cpu)) {
            resultList.push(returnObj(item[i], cpuFreqData[j], sum, (flag = 5))!);
            item.splice(i, 1);
            i--;
            break;
          }
        }
      }
    }
    runningFreqData.set(key, mergeSameData(resultList));
  });
  return dealTree(runningFreqData);
}

/**
 *
 * @param item running数据
 * @param cpuFreqData 频点数据
 * @param sum running总和
 * @param flag 标志位，根据不同值返回不同结果
 * @returns 返回新的对象
 */
function returnObj(
  item: RunningData,
  cpuFreqData: CpuFreqData,
  sum: number,
  flag: number
): RunningFreqData | undefined {
  const PERCENT: number = 100;
  const FREQ_MUTIPLE: number = 1000;
  //@ts-ignore
  const computorPower: number = comPower ? comPower.get(item.cpu)?.mapData.get(cpuFreqData.value)! : 0;
  let result;
  switch (flag) {
    case 1:
      result = {
        thread: item.pid + '_' + item.tid,
        consumption: cpuFreqData.value * item.dur,
        cpu: item.cpu,
        frequency: computorPower ? cpuFreqData.value / FREQ_MUTIPLE + ': ' + computorPower : cpuFreqData.value / FREQ_MUTIPLE,
        dur: item.dur,
        percent: (item.dur / sum) * PERCENT,
        consumpower: computorPower * item.dur,
        cpuload: (computorPower * item.dur) / (timeZones * maxCommpuPower) * PERCENT
      };
      break;
    case 2:
      result = {
        thread: item.pid + '_' + item.tid,
        consumption: cpuFreqData.value * (cpuFreqData.ts + cpuFreqData.dur - item.ts),
        cpu: item.cpu,
        frequency: computorPower ? cpuFreqData.value / FREQ_MUTIPLE + ': ' + computorPower : cpuFreqData.value / FREQ_MUTIPLE,
        dur: cpuFreqData.ts + cpuFreqData.dur - item.ts,
        percent: ((cpuFreqData.ts + cpuFreqData.dur - item.ts) / sum) * PERCENT,
        consumpower: computorPower * (cpuFreqData.ts + cpuFreqData.dur - item.ts),
        cpuload: (computorPower * (cpuFreqData.ts + cpuFreqData.dur - item.ts)) / (timeZones * maxCommpuPower) * PERCENT
      };
      break;
    case 3:
      result = {
        thread: item.pid + '_' + item.tid,
        consumption: cpuFreqData.value * (item.dur + item.ts - cpuFreqData.ts),
        cpu: item.cpu,
        frequency: computorPower ? cpuFreqData.value / FREQ_MUTIPLE + ': ' + computorPower : cpuFreqData.value / FREQ_MUTIPLE,
        dur: item.dur + item.ts - cpuFreqData.ts,
        percent: ((item.dur + item.ts - cpuFreqData.ts) / sum) * PERCENT,
        consumpower: computorPower * (item.dur + item.ts - cpuFreqData.ts),
        cpuload: (computorPower * (item.dur + item.ts - cpuFreqData.ts)) / (timeZones * maxCommpuPower) * PERCENT
      };
      break;
    case 4:
      result = {
        thread: item.pid + '_' + item.tid,
        consumption: cpuFreqData.value * cpuFreqData.dur,
        cpu: item.cpu,
        frequency: computorPower ? cpuFreqData.value / FREQ_MUTIPLE + ': ' + computorPower : cpuFreqData.value / FREQ_MUTIPLE,
        dur: cpuFreqData.dur,
        percent: (cpuFreqData.dur / sum) * PERCENT,
        consumpower: computorPower * cpuFreqData.dur,
        cpuload: (computorPower * cpuFreqData.dur) / (timeZones * maxCommpuPower) * PERCENT
      };
      break;
    case 5:
      result = {
        thread: item.pid + '_' + item.tid,
        consumption: 0,
        cpu: item.cpu,
        frequency: 'unknown',
        dur: item.dur,
        percent: (item.dur / sum) * PERCENT,
        consumpower: 0,
        cpuload: 0
      };
      break;
  }
  return result;
}

/**
 *
 * @param resultList 单线程内running数据与cpu频点数据整合成的数组
 */
function mergeSameData(
  resultList: Array<RunningFreqData>
): Array<RunningFreqData> {
  let cpuFreqArr: Array<RunningFreqData> = [];
  let cpuArr: Array<number> = [];
  //合并同一线程内，当运行所在cpu和频点相同时，dur及percent进行累加求和
  for (let i = 0; i < resultList.length; i++) {
    if (!cpuArr.includes(resultList[i].cpu)) {
      cpuArr.push(resultList[i].cpu);
      cpuFreqArr.push(creatNewObj(resultList[i].cpu));
    }
    for (let j = i + 1; j < resultList.length; j++) {
      if (
        resultList[i].cpu === resultList[j].cpu &&
        resultList[i].frequency === resultList[j].frequency
      ) {
        resultList[i].dur += resultList[j].dur;
        resultList[i].percent += resultList[j].percent;
        resultList[i].consumption += resultList[j].consumption;
        resultList[i].consumpower += resultList[j].consumpower;
        resultList[i].cpuload += resultList[j].cpuload;
        resultList.splice(j, 1);
        j--;
      }
    }
    cpuFreqArr.find(function (item) {
      if (item.cpu === resultList[i].cpu) {
        item.children?.push(resultList[i]);
        item.children?.sort((a, b) => b.consumption - a.consumption);
        item.dur += resultList[i].dur;
        item.percent += resultList[i].percent;
        item.consumption += resultList[i].consumption;
        item.consumpower += resultList[i].consumpower;
        item.cpuload += resultList[i].cpuload;
        item.thread = resultList[i].thread;
      }
    });
  }
  cpuFreqArr.sort((a, b) => a.cpu - b.cpu);
  return cpuFreqArr;
}

/**
 *
 * @param params cpu层级的数据
 * @returns 整理好的进程级数据
 */
function dealTree(
  params: Map<string, Array<RunningFreqData>>
): Array<RunningFreqData> {
  let result: Array<RunningFreqData> = [];
  params.forEach((item, key) => {
    let process: RunningFreqData = creatNewObj(-1, false);
    let thread: RunningFreqData = creatNewObj(-2);
    for (let i = 0; i < item.length; i++) {
      thread.children?.push(item[i]);
      thread.dur += item[i].dur;
      thread.percent += item[i].percent;
      thread.consumption += item[i].consumption;
      thread.consumpower += item[i].consumpower;
      thread.cpuload += item[i].cpuload;
      thread.thread = item[i].thread;
    }
    process.children?.push(thread);
    process.dur += thread.dur;
    process.percent += thread.percent;
    process.consumption += thread.consumption;
    process.consumpower += thread.consumpower;
    process.cpuload += thread.cpuload;
    process.thread = process.thread! + key.split('_')[0];
    result.push(process);
  });
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      if (result[i].thread === result[j].thread) {
        result[i].children?.push(result[j].children![0]);
        result[i].dur += result[j].dur;
        result[i].percent += result[j].percent;
        result[i].consumption += result[j].consumption;
        result[i].consumpower += result[j].consumpower;
        result[i].cpuload += result[j].cpuload;
        result.splice(j, 1);
        j--;
      }
    }
  }
  return result;
}

/**
 *
 * @param cpu 根据cpu值创建层级结构,cpu < 0为线程、进程层级，其余为cpu层级
 * @returns
 */
function creatNewObj(cpu: number, flag: boolean = true): RunningFreqData {
  return {
    thread: flag ? '' : 'P',
    consumption: 0,
    cpu: cpu,
    frequency: -1,
    dur: 0,
    percent: 0,
    children: [],
    consumpower: 0,
    cpuload: 0
  };
}

/**
 *
 * @param arr 需要整理汇总的频点级数据
 * @returns 返回一个total->cpu->频点的三级树结构数组
 */
function fixTotal(arr: Array<RunningFreqData>): Array<RunningFreqData> {
  let result: Array<RunningFreqData> = [];
  let flag: number = -1;
  // 数据入参的情况是，第一条为进程数据，其后是该进程下所有线程的数据。以进程数据做分割
  for (let i = 0; i < arr.length; i++) {
    // 判断如果是进程数据，则将其children的数组清空，并以其作为最顶层数据
    if (arr[i].thread?.indexOf('P') !== -1) {
      arr[i].children = [];
      arr[i].thread = arr[i].thread + '-summary data';
      result.push(arr[i]);
      // 标志判定当前数组的长度，也可用.length判断
      flag++;
    } else {
      // 非进程数据会进入到else中，去判断当前线程数据的cpu分组是否存在，不存在则进行创建
      if (result[flag].children![arr[i].cpu] === undefined) {
        result[flag].children![arr[i].cpu] = {
          thread: 'summary data',
          consumption: 0,
          cpu: arr[i].cpu,
          frequency: -1,
          dur: 0,
          percent: 0,
          children: [],
          consumpower: 0,
          cpuload: 0
        };
      }
      // 每有一条数据要放到cpu分组下时，则将该cpu分组的各项数据累和
      result[flag].children![arr[i].cpu].consumption += arr[i].consumption;
      result[flag].children![arr[i].cpu].consumpower += arr[i].consumpower;
      result[flag].children![arr[i].cpu].cpuload += arr[i].cpuload;
      result[flag].children![arr[i].cpu].dur += arr[i].dur;
      result[flag].children![arr[i].cpu].percent += arr[i].percent;
      // 查找当前cpu分组下是否存在与当前数据的频点相同的数据，返回相同数据的索引值
      let index: number = result[flag].children![
        arr[i].cpu
      ].children?.findIndex((item) => item.frequency === arr[i].frequency)!;
      // 若存在相同频点的数据，则进行合并，不同直接push
      if (index === -1) {
        arr[i].thread = 'summary data';
        result[flag].children![arr[i].cpu].children?.push(arr[i]);
      } else {
        result[flag].children![arr[i].cpu].children![index].consumption += arr[i].consumption;
        result[flag].children![arr[i].cpu].children![index].consumpower += arr[i].consumpower;
        result[flag].children![arr[i].cpu].children![index].dur += arr[i].dur;
        result[flag].children![arr[i].cpu].children![index].percent += arr[i].percent;
        result[flag].children![arr[i].cpu].children![index].cpuload += arr[i].cpuload;
      }
    }
  }
  return result;
}

/**
 *
 * @param arr1 前次整理好的区分线程的数据
 * @param arr2 不区分线程的Total数据
 */
function mergeTotal(
  arr1: Array<RunningFreqData>,
  arr2: Array<RunningFreqData>
): void {
  for (let i = 0; i < arr1.length; i++) {
    const num: number = arr2.findIndex((item) =>
      item.thread?.includes(arr1[i].thread!)
    );
    arr2[num].thread = 'summary data';
    arr1[i].children?.unshift(arr2[num]);
    arr2.splice(num, 1);
  }
}


/**
 *
 * @param arr 待整理的数组，会经过递归取到最底层的数据
 */
function recursion(arr: Array<RunningFreqData>): void {
  for (let idx = 0; idx < arr.length; idx++) {
    if (arr[idx].cpu === -1) {
      resultArray.push(arr[idx]);
    }
    if (arr[idx].children) {
      recursion(arr[idx].children!);
    } else {
      resultArray.push(arr[idx]);
    }
  }
}

self.onmessage = (e: MessageEvent): void => {
  comPower = e.data.comPower;
  resultArray = [];
  timeZones = e.data.rightNs - e.data.leftNs;
  maxCommpuPower = 0;
  if (comPower) {
    comPower.forEach(item => {
      let maxFreq = 0;
      let commpuPower = 0;
      //@ts-ignore
      for (const i of item.mapData.entries()) {
        if (i[0] > maxFreq) {
          maxFreq = i[0];
          commpuPower = i[1];
        }
      }
      //@ts-ignore
      maxCommpuPower += commpuPower * item.smtRate;
    });
  }
  let result = orgnazitionMap(e.data);
  recursion(result);
  resultArray = JSON.parse(JSON.stringify(resultArray));
  mergeTotal(result, fixTotal(resultArray));
  self.postMessage(result);
};
import { type CpuFreqData, type RunningFreqData, type RunningData } from '../component/trace/sheet/frequsage/TabPaneFreqUsageConfig';

let comPower = new Map<number, Map<number, unknown>>();
let resultArray: Array<RunningFreqData> = [];
let timeZones: number = 0;
let maxCommpuPower: number = 0;

/**
 *
 * @param args.runData 数据库查询上来的running数据，此函数会将数据整理成map结构，分组规则：'pid_tid'为键，running数据数字为值
 * @returns 返回map对象及所有running数据的dur和，后续会依此计算百分比
 */
function orgnazitionMap(
  args: {
    runData: Array<RunningData>;
    cpuFreqData: Array<CpuFreqData>;
    leftNs: number;
    rightNs: number;
    cpuArray: number[];
  }
): Array<RunningFreqData> {
  let result: Map<string, Array<RunningData>> = new Map();
  let sum: number = 0;
  // 循环分组
  for (let i = 0; i < args.runData.length; i++) {
    let mapKey: string = args.runData[i].pid + '_' + args.runData[i].tid;
    // 该running数据若在map对象中不包含其'pid_tid'构成的键，则新加key-value值
    if (!result.has(mapKey)) {
      result.set(mapKey, new Array());
    }
    // 整理左右边界数据问题, 因为涉及多线程，所以必须放在循环里
    if (
      args.runData[i].ts < args.leftNs &&
      args.runData[i].ts + args.runData[i].dur > args.leftNs
    ) {
      args.runData[i].dur = args.runData[i].ts + args.runData[i].dur - args.leftNs;
      args.runData[i].ts = args.leftNs;
    }
    if (args.runData[i].ts + args.runData[i].dur > args.rightNs) {
      args.runData[i].dur = args.rightNs - args.runData[i].ts;
    }
    // 特殊处理数据表中dur为负值的情况
    if (args.runData[i].dur < 0) {
      args.runData[i].dur = 0;
    }
    // 分组整理数据
    result.get(mapKey)?.push({
      pid: args.runData[i].pid,
      tid: args.runData[i].tid,
      cpu: args.runData[i].cpu,
      dur: args.runData[i].dur,
      ts: args.runData[i].ts,
    });
    sum += args.runData[i].dur;
  }
  return dealCpuFreqData(args.cpuFreqData, result, sum, args.cpuArray);
}
import { type CpuFreqData, type RunningFreqData, type RunningData } from '../component/trace/sheet/frequsage/TabPaneFreqUsageConfig';

let comPower = new Map<number, Map<number, unknown>>();
let resultArray: Array<RunningFreqData> = [];
let timeZones: number = 0;
let maxCommpuPower: number = 0;

/**
 *
 * @param args.runData 数据库查询上来的running数据，此函数会将数据整理成map结构，分组规则：'pid_tid'为键，running数据数字为值
 * @returns 返回map对象及所有running数据的dur和，后续会依此计算百分比
 */
function orgnazitionMap(
  args: {
    runData: Array<RunningData>;
    cpuFreqData: Array<CpuFreqData>;
    leftNs: number;
    rightNs: number;
    cpuArray: number[];
  }
): Array<RunningFreqData> {
  let result: Map<string, Array<RunningData>> = new Map();
  let sum: number = 0;
  // 循环分组
  for (let i = 0; i < args.runData.length; i++) {
    let mapKey: string = args.runData[i].pid + '_' + args.runData[i].tid;
    // 该running数据若在map对象中不包含其'pid_tid'构成的键，则新加key-value值
    if (!result.has(mapKey)) {
      result.set(mapKey, new Array());
    }
    // 整理左右边界数据问题, 因为涉及多线程，所以必须放在循环里
    if (
      args.runData[i].ts < args.leftNs &&
      args.runData[i].ts + args.runData[i].dur > args.leftNs
    ) {
      args.runData[i].dur = args.runData[i].ts + args.runData[i].dur - args.leftNs;
      args.runData[i].ts = args.leftNs;
    }
    if (args.runData[i].ts + args.runData[i].dur > args.rightNs) {
      args.runData[i].dur = args.rightNs - args.runData[i].ts;
    }
    // 特殊处理数据表中dur为负值的情况
    if (args.runData[i].dur < 0) {
      args.runData[i].dur = 0;
    }
    // 分组整理数据
    result.get(mapKey)?.push({
      pid: args.runData[i].pid,
      tid: args.runData[i].tid,
      cpu: args.runData[i].cpu,
      dur: args.runData[i].dur,
      ts: args.runData[i].ts,
    });
    sum += args.runData[i].dur;
  }
  return dealCpuFreqData(args.cpuFreqData, result, sum, args.cpuArray);
}
import { type CpuFreqData, type RunningFreqData, type RunningData } from '../component/trace/sheet/frequsage/TabPaneFreqUsageConfig';

let comPower = new Map<number, Map<number, unknown>>();
let resultArray: Array<RunningFreqData> = [];
let timeZones: number = 0;
let maxCommpuPower: number = 0;

/**
 *
 * @param args.runData 数据库查询上来的running数据，此函数会将数据整理成map结构，分组规则：'pid_tid'为键，running数据数字为值
 * @returns 返回map对象及所有running数据的dur和，后续会依此计算百分比
 */
function orgnazitionMap(
  args: {
    runData: Array<RunningData>;
    cpuFreqData: Array<CpuFreqData>;
    leftNs: number;
    rightNs: number;
    cpuArray: number[];
  }
): Array<RunningFreqData> {
  let result: Map<string, Array<RunningData>> = new Map();
  let sum: number = 0;
  // 循环分组
  for (let i = 0; i < args.runData.length; i++) {
    let mapKey: string = args.runData[i].pid + '_' + args.runData[i].tid;
    // 该running数据若在map对象中不包含其'pid_tid'构成的键，则新加key-value值
    if (!result.has(mapKey)) {
      result.set(mapKey, new Array());
    }
    // 整理左右边界数据问题, 因为涉及多线程，所以必须放在循环里
    if (
      args.runData[i].ts < args.leftNs &&
      args.runData[i].ts + args.runData[i].dur > args.leftNs
    ) {
      args.runData[i].dur = args.runData[i].ts + args.runData[i].dur - args.leftNs;
      args.runData[i].ts = args.leftNs;
    }
    if (args.runData[i].ts + args.runData[i].dur > args.rightNs) {
      args.runData[i].dur = args.rightNs - args.runData[i].ts;
    }
    // 特殊处理数据表中dur为负值的情况
    if (args.runData[i].dur < 0) {
      args.runData[i].dur = 0;
    }
    // 分组整理数据
    result.get(mapKey)?.push({
      pid: args.runData[i].pid,
      tid: args.runData[i].tid,
      cpu: args.runData[i].cpu,
      dur: args.runData[i].dur,
      ts: args.runData[i].ts,
    });
    sum += args.runData[i].dur;
  }
  return dealCpuFreqData(args.cpuFreqData, result, sum, args.cpuArray);
}
import { type CpuFreqData, type RunningFreqData, type RunningData } from '../component/trace/sheet/frequsage/TabPaneFreqUsageConfig';

let comPower = new Map<number, Map<number, unknown>>();
let resultArray: Array<RunningFreqData> = [];
let timeZones: number = 0;
let maxCommpuPower: number = 0;

/**
 *
 * @param args.runData 数据库查询上来的running数据，此函数会将数据整理成map结构，分组规则：'pid_tid'为键，running数据数字为值
 * @returns 返回map对象及所有running数据的dur和，后续会依此计算百分比
 */
function orgnazitionMap(
  args: {
    runData: Array<RunningData>;
    cpuFreqData: Array<CpuFreqData>;
    leftNs: number;
    rightNs: number;
    cpuArray: number[];
  }
): Array<RunningFreqData> {
  let result: Map<string, Array<RunningData>> = new Map();
  let sum: number = 0;
  // 循环分组
  for (let i = 0; i < args.runData.length; i++) {
    let mapKey: string = args.runData[i].pid + '_' + args.runData[i].tid;
    // 该running数据若在map对象中不包含其'pid_tid'构成的键，则新加key-value值
    if (!result.has(mapKey)) {
      result.set(mapKey, new Array());
    }
    // 整理左右边界数据问题, 因为涉及多线程，所以必须放在循环里
    if (
      args.runData[i].ts < args.leftNs &&
      args.runData[i].ts + args.runData[i].dur > args.leftNs
    ) {
      args.runData[i].dur = args.runData[i].ts + args.runData[i].dur - args.leftNs;
      args.runData[i].ts = args.leftNs;
    }
    if (args.runData[i].ts + args.runData[i].dur > args.rightNs) {
      args.runData[i].dur = args.rightNs - args.runData[i].ts;
    }
    // 特殊处理数据表中dur为负值的情况
    if (args.runData[i].dur < 0) {
      args.runData[i].dur = 0;
    }
    // 分组整理数据
    result.get(mapKey)?.push({
      pid: args.runData[i].pid,
      tid: args.runData[i].tid,
      cpu: args.runData[i].cpu,
      dur: args.runData[i].dur,
      ts: args.runData[i].ts,
    });
    sum += args.runData[i].dur;
  }
  return dealCpuFreqData(args.cpuFreqData, result, sum, args.cpuArray);
}
import { type CpuFreqData, type RunningFreqData, type RunningData } from '../component/trace/sheet/frequsage/TabPaneFreqUsageConfig';

let comPower = new Map<number, Map<number, unknown>>();
let resultArray: Array<RunningFreqData> = [];
let timeZones: number = 0;
let maxCommpuPower: number = 0;

/**
 *
 * @param args.runData 数据库查询上来的running数据，此函数会将数据整理成map结构，分组规则：'pid_tid'为键，running数据数字为值
 * @returns 返回map对象及所有running数据的dur和，后续会依此计算百分比
 */
function orgnazitionMap(
  args: {
    runData: Array<RunningData>;
    cpuFreqData: Array<CpuFreqData>;
    leftNs: number;
    rightNs: number;
    cpuArray: number[];
  }
): Array<RunningFreqData> {
  let result: Map<string, Array<RunningData>> = new Map();
  let sum: number = 0;
  // 循环分组
  for (let i = 0; i < args.runData.length; i++) {
    let mapKey: string = args.runData[i].pid + '_' + args.runData[i].tid;
    // 该running数据若在map对象中不包含其'pid_tid'构成的键，则新加key-value值
    if (!result.has(mapKey)) {
      result.set(mapKey, new Array());
    }
    // 整理左右边界数据问题, 因为涉及多线程，所以必须放在循环里
    if (
      args.runData[i].ts < args.leftNs &&
      args.runData[i].ts + args.runData[i].dur > args.leftNs
    ) {
      args.runData[i].dur = args.runData[i].ts + args.runData[i].dur - args.leftNs;
      args.runData[i].ts = args.leftNs;
    }
    if (args.runData[i].ts + args.runData[i].dur > args.rightNs) {
      args.runData[i].dur = args.rightNs - args.runData[i].ts;
    }
    // 特殊处理数据表中dur为负值的情况
    if (args.runData[i].dur < 0) {
      args.runData[i].dur = 0;
    }
    // 分组整理数据
    result.get(mapKey)?.push({
      pid: args.runData[i].pid,
      tid: args.runData[i].tid,
      cpu: args.runData[i].cpu,
      dur: args.runData[i].dur,
      ts: args.runData[i].ts,
    });
    sum += args.runData[i].dur;
  }
  return dealCpuFreqData(args.cpuFreqData, result, sum, args.cpuArray);
}
