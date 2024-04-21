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

import { BaseStruct, dataFilterHandler, drawLoadingFrame, drawString, isFrameContainPoint, Render } from './ProcedureWorkerCommon';
import { TraceRow } from '../../component/trace/base/TraceRow';
import { ColorUtils } from '../../component/trace/base/ColorUtils';
import {SpSystemTrace} from "../../component/SpSystemTrace";

export class PerfToolRender extends Render {
  renderMainThread(
    perfReq: {
      context: CanvasRenderingContext2D;
      useCache: boolean;
      type: string;
      index: number;
    },
    row: TraceRow<PerfToolStruct>
  ) {
    PerfToolStruct.index = perfReq.index;
    let perfToolList = row.dataList;
    let perfToolFilter = row.dataListCache;
    dataFilterHandler(perfToolList, perfToolFilter, {
      startKey: 'startNS',
      durKey: 'dur',
      startNS: TraceRow.range?.startNS ?? 0,
      endNS: TraceRow.range?.endNS ?? 0,
      totalNS: TraceRow.range?.totalNS ?? 0,
      frame: row.frame,
      paddingTop: 5,
      useCache: perfReq.useCache || !(TraceRow.range?.refresh ?? false),
    });
    drawLoadingFrame(perfReq.context, perfToolFilter, row);
    perfReq.context.beginPath();
    let find = false;
    for (let re of perfToolFilter) {
      PerfToolStruct.draw(perfReq.context, re);
      if (row.isHover && re.frame && isFrameContainPoint(re.frame, row.hoverX, row.hoverY)) {
        PerfToolStruct.hoverPerfToolStruct = re;
        find = true;
      }
    }
    if (!find && row.isHover) PerfToolStruct.hoverPerfToolStruct = undefined;
    perfReq.context.closePath();
  }
}
export function PerfToolsStructOnClick(clickRowType: string, sp: SpSystemTrace) {
  return new Promise((resolve, reject) => {
    if (clickRowType === TraceRow.ROW_TYPE_PERF_TOOL && PerfToolStruct.hoverPerfToolStruct) {
      PerfToolStruct.selectPerfToolStruct = PerfToolStruct.hoverPerfToolStruct;
      sp.traceSheetEL?.displayPerfToolsData(PerfToolStruct.selectPerfToolStruct);
      sp.timerShaftEL?.modifyFlagList(undefined);
      reject(new Error());
    }else{
      resolve(null);
    }
  });
}
export class PerfToolStruct extends BaseStruct {
  static hoverPerfToolStruct: PerfToolStruct | undefined;
  static selectPerfToolStruct: PerfToolStruct | undefined;
  static index = 0;
  count: string | undefined;
  startNS: number | undefined;
  dur: number | undefined; //自补充，数据库没有返回
  id: number | undefined;
  name: string | undefined;

  static draw(PerfContext: CanvasRenderingContext2D, data: PerfToolStruct) {
    if (data.frame) {
      let width = data.frame.width || 0;
      PerfContext.globalAlpha = 1;
      PerfContext.fillStyle = ColorUtils.colorForTid(PerfToolStruct.index);
      PerfContext.fillRect(data.frame.x, data.frame.y, width, data.frame.height);
      if (data.frame.width > 7) {
        PerfContext.textBaseline = 'middle';
        PerfContext.lineWidth = 1;
        let countText: string | undefined = '';
        if (data.count) {
          countText = `${data.count}`;
        }
        PerfContext.fillStyle = ColorUtils.funcTextColor('#000');
        drawString(PerfContext, countText, 2, data.frame, data);
      }
      if (data.id == PerfToolStruct.selectPerfToolStruct?.id &&
        data.name == PerfToolStruct.selectPerfToolStruct?.name) {
          PerfContext.strokeStyle = '#000';
          PerfContext.lineWidth = 2;
          PerfContext.strokeRect(data.frame.x, data.frame.y + 1, data.frame.width, data.frame.height - 2);
      }
    }
  }

  static isHover(clock: PerfToolStruct) {
    return clock === PerfToolStruct.hoverPerfToolStruct || clock === PerfToolStruct.selectPerfToolStruct;
  }
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

import { BaseStruct, dataFilterHandler, drawLoadingFrame, drawString, isFrameContainPoint, Render } from './ProcedureWorkerCommon';
import { TraceRow } from '../../component/trace/base/TraceRow';
import { ColorUtils } from '../../component/trace/base/ColorUtils';
import {SpSystemTrace} from "../../component/SpSystemTrace";

export class PerfToolRender extends Render {
  renderMainThread(
    perfReq: {
      context: CanvasRenderingContext2D;
      useCache: boolean;
      type: string;
      index: number;
    },
    row: TraceRow<PerfToolStruct>
  ) {
    PerfToolStruct.index = perfReq.index;
    let perfToolList = row.dataList;
    let perfToolFilter = row.dataListCache;
    dataFilterHandler(perfToolList, perfToolFilter, {
      startKey: 'startNS',
      durKey: 'dur',
      startNS: TraceRow.range?.startNS ?? 0,
      endNS: TraceRow.range?.endNS ?? 0,
      totalNS: TraceRow.range?.totalNS ?? 0,
      frame: row.frame,
      paddingTop: 5,
      useCache: perfReq.useCache || !(TraceRow.range?.refresh ?? false),
    });
    drawLoadingFrame(perfReq.context, perfToolFilter, row);
    perfReq.context.beginPath();
    let find = false;
    for (let re of perfToolFilter) {
      PerfToolStruct.draw(perfReq.context, re);
      if (row.isHover && re.frame && isFrameContainPoint(re.frame, row.hoverX, row.hoverY)) {
        PerfToolStruct.hoverPerfToolStruct = re;
        find = true;
      }
    }
    if (!find && row.isHover) PerfToolStruct.hoverPerfToolStruct = undefined;
    perfReq.context.closePath();
  }
}
export function PerfToolsStructOnClick(clickRowType: string, sp: SpSystemTrace) {
  return new Promise((resolve, reject) => {
    if (clickRowType === TraceRow.ROW_TYPE_PERF_TOOL && PerfToolStruct.hoverPerfToolStruct) {
      PerfToolStruct.selectPerfToolStruct = PerfToolStruct.hoverPerfToolStruct;
      sp.traceSheetEL?.displayPerfToolsData(PerfToolStruct.selectPerfToolStruct);
      sp.timerShaftEL?.modifyFlagList(undefined);
      reject(new Error());
    }else{
      resolve(null);
    }
  });
}
export class PerfToolStruct extends BaseStruct {
  static hoverPerfToolStruct: PerfToolStruct | undefined;
  static selectPerfToolStruct: PerfToolStruct | undefined;
  static index = 0;
  count: string | undefined;
  startNS: number | undefined;
  dur: number | undefined; //自补充，数据库没有返回
  id: number | undefined;
  name: string | undefined;

  static draw(PerfContext: CanvasRenderingContext2D, data: PerfToolStruct) {
    if (data.frame) {
      let width = data.frame.width || 0;
      PerfContext.globalAlpha = 1;
      PerfContext.fillStyle = ColorUtils.colorForTid(PerfToolStruct.index);
      PerfContext.fillRect(data.frame.x, data.frame.y, width, data.frame.height);
      if (data.frame.width > 7) {
        PerfContext.textBaseline = 'middle';
        PerfContext.lineWidth = 1;
        let countText: string | undefined = '';
        if (data.count) {
          countText = `${data.count}`;
        }
        PerfContext.fillStyle = ColorUtils.funcTextColor('#000');
        drawString(PerfContext, countText, 2, data.frame, data);
      }
      if (data.id == PerfToolStruct.selectPerfToolStruct?.id &&
        data.name == PerfToolStruct.selectPerfToolStruct?.name) {
          PerfContext.strokeStyle = '#000';
          PerfContext.lineWidth = 2;
          PerfContext.strokeRect(data.frame.x, data.frame.y + 1, data.frame.width, data.frame.height - 2);
      }
    }
  }

  static isHover(clock: PerfToolStruct) {
    return clock === PerfToolStruct.hoverPerfToolStruct || clock === PerfToolStruct.selectPerfToolStruct;
  }
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

import { BaseStruct, dataFilterHandler, drawLoadingFrame, drawString, isFrameContainPoint, Render } from './ProcedureWorkerCommon';
import { TraceRow } from '../../component/trace/base/TraceRow';
import { ColorUtils } from '../../component/trace/base/ColorUtils';
import {SpSystemTrace} from "../../component/SpSystemTrace";

export class PerfToolRender extends Render {
  renderMainThread(
    perfReq: {
      context: CanvasRenderingContext2D;
      useCache: boolean;
      type: string;
      index: number;
    },
    row: TraceRow<PerfToolStruct>
  ) {
    PerfToolStruct.index = perfReq.index;
    let perfToolList = row.dataList;
    let perfToolFilter = row.dataListCache;
    dataFilterHandler(perfToolList, perfToolFilter, {
      startKey: 'startNS',
      durKey: 'dur',
      startNS: TraceRow.range?.startNS ?? 0,
      endNS: TraceRow.range?.endNS ?? 0,
      totalNS: TraceRow.range?.totalNS ?? 0,
      frame: row.frame,
      paddingTop: 5,
      useCache: perfReq.useCache || !(TraceRow.range?.refresh ?? false),
    });
    drawLoadingFrame(perfReq.context, perfToolFilter, row);
    perfReq.context.beginPath();
    let find = false;
    for (let re of perfToolFilter) {
      PerfToolStruct.draw(perfReq.context, re);
      if (row.isHover && re.frame && isFrameContainPoint(re.frame, row.hoverX, row.hoverY)) {
        PerfToolStruct.hoverPerfToolStruct = re;
        find = true;
      }
    }
    if (!find && row.isHover) PerfToolStruct.hoverPerfToolStruct = undefined;
    perfReq.context.closePath();
  }
}
export function PerfToolsStructOnClick(clickRowType: string, sp: SpSystemTrace) {
  return new Promise((resolve, reject) => {
    if (clickRowType === TraceRow.ROW_TYPE_PERF_TOOL && PerfToolStruct.hoverPerfToolStruct) {
      PerfToolStruct.selectPerfToolStruct = PerfToolStruct.hoverPerfToolStruct;
      sp.traceSheetEL?.displayPerfToolsData(PerfToolStruct.selectPerfToolStruct);
      sp.timerShaftEL?.modifyFlagList(undefined);
      reject(new Error());
    }else{
      resolve(null);
    }
  });
}
export class PerfToolStruct extends BaseStruct {
  static hoverPerfToolStruct: PerfToolStruct | undefined;
  static selectPerfToolStruct: PerfToolStruct | undefined;
  static index = 0;
  count: string | undefined;
  startNS: number | undefined;
  dur: number | undefined; //自补充，数据库没有返回
  id: number | undefined;
  name: string | undefined;

  static draw(PerfContext: CanvasRenderingContext2D, data: PerfToolStruct) {
    if (data.frame) {
      let width = data.frame.width || 0;
      PerfContext.globalAlpha = 1;
      PerfContext.fillStyle = ColorUtils.colorForTid(PerfToolStruct.index);
      PerfContext.fillRect(data.frame.x, data.frame.y, width, data.frame.height);
      if (data.frame.width > 7) {
        PerfContext.textBaseline = 'middle';
        PerfContext.lineWidth = 1;
        let countText: string | undefined = '';
        if (data.count) {
          countText = `${data.count}`;
        }
        PerfContext.fillStyle = ColorUtils.funcTextColor('#000');
        drawString(PerfContext, countText, 2, data.frame, data);
      }
      if (data.id == PerfToolStruct.selectPerfToolStruct?.id &&
        data.name == PerfToolStruct.selectPerfToolStruct?.name) {
          PerfContext.strokeStyle = '#000';
          PerfContext.lineWidth = 2;
          PerfContext.strokeRect(data.frame.x, data.frame.y + 1, data.frame.width, data.frame.height - 2);
      }
    }
  }

  static isHover(clock: PerfToolStruct) {
    return clock === PerfToolStruct.hoverPerfToolStruct || clock === PerfToolStruct.selectPerfToolStruct;
  }
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

import { SpSystemTrace } from '../SpSystemTrace';
import { TraceRow } from '../trace/base/TraceRow';
import { renders } from '../../database/ui-worker/ProcedureWorker';
import { info } from '../../../log/Log';
import { PerfToolRender, PerfToolStruct } from '../../database/ui-worker/ProcedureWorkerPerfTool';
import { ColorUtils } from '../trace/base/ColorUtils';
import { EmptyRender } from '../../database/ui-worker/cpu/ProcedureWorkerCPU';
import { Utils } from '../trace/base/Utils';
import { clockDataSender } from '../../database/data-trafic/ClockDataSender';
import { queryPerfOutputData } from '../../database/sql/SqlLite.sql';

export class SpPerfOutputDataChart {
  private trace: SpSystemTrace;
  private startTime: number | undefined;
  private perfOutputArr: Array<string> | undefined;
  private dur: number | undefined;
  private perfName: string | undefined;

  constructor(trace: SpSystemTrace) {
    this.trace = trace;
  }

  async init(): Promise<void> {
    let perfOutputData = await queryPerfOutputData();
    if(perfOutputData.length === 0) {
      return;
    }
    this.perfName = perfOutputData[0].name;
    this.perfOutputArr = perfOutputData[0].name.split(':')[2].split(',');
    let endTime: number = perfOutputData[0].ts;
    this.dur = Number(this.perfOutputArr![this.perfOutputArr!.length -2]);
    this.startTime = endTime - window.recordStartNS - this.dur ;
    let folder = await this.initFolder();
    this.trace.rowsEL?.appendChild(folder);
    this.initData(folder);
  }

  private clockThreadHandler(
    traceRow: TraceRow<PerfToolStruct>,
    it: {
      name: string;
    },
    perfId: number
  ): void {
    traceRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (traceRow.currentContext) {
        context = traceRow.currentContext;
      } else {
        context = traceRow.collect ? this.trace.canvasFavoritePanelCtx! : this.trace.canvasPanelCtx!;
      }
      traceRow.canvasSave(context);
      (renders['perfTool'] as PerfToolRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: it.name,
          index: perfId,
        },
        traceRow
      );
      traceRow.canvasRestore(context, this.trace);
    };
  }

  async initData(folder: TraceRow<any>): Promise<void> {
    let perfToolStartTime = new Date().getTime();
    let perfToolList = [
      { name: 'Application Process CPU Power Consumption(MAS)', idx: 26 }, 
      { name: 'RS Process CPU Power Consumption(MAS)', idx: 27 }, 
      { name: 'Media Process CPU Power Consumption(MAS)', idx: 28 },
      { name: 'Foundation Process CPU Power Consumption(MAS)', idx: 29 },
      { name: 'Gpu Power Consumption(MAS)', idx: 30 },
      { name: 'DDR Power Consumption(MAS)', idx: 31 },
      { name: 'IO Count', idx: 34 }, 
      { name: 'Block Count', idx: 35 },
      { name: 'IPI Count(Application Main Thread)', idx: 50 }, 
      { name: 'IPI Count(RS)', idx: 51 }];
    info('perfTools data size is: ', perfToolList!.length);
    for (let i = 0; i < perfToolList.length; i++) {
      const it = perfToolList[i];
      let traceRow = TraceRow.skeleton<PerfToolStruct>();
      traceRow.rowId = i+'';
      traceRow.rowType = TraceRow.ROW_TYPE_PERF_TOOL;
      traceRow.rowParentId = folder.rowId;
      traceRow.style.height = '40px';
      traceRow.name = it.name;
      traceRow.rowHidden = !folder.expansion;
      traceRow.setAttribute('children', '');
      traceRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
      traceRow.selectChangeHandler = this.trace.selectChangeHandler;
      traceRow.supplierFrame = (): Promise<PerfToolStruct[]> => {
        let data = new PerfToolStruct();
        data.startNS = this.startTime;
        data.dur = this.dur;
        data.count = this.perfOutputArr![it.idx];
        data.id = i + 1;
        data.name = it.name;
        return new Promise<Array<any>>((resolve) => resolve([data]));
      };
      traceRow.findHoverStruct = (): void => {
        PerfToolStruct.hoverPerfToolStruct = traceRow.getHoverStruct();
      };
      this.clockThreadHandler(traceRow, it, i);
      folder.addChildTraceRow(traceRow);
    }
    let durTime = new Date().getTime() - perfToolStartTime;
    info('The time to load the ClockData is: ', durTime);
  }

  async initFolder(): Promise<TraceRow<any>> {
    let perfFolder = TraceRow.skeleton();
    perfFolder.rowId = 'perfTool';
    perfFolder.index = 0;
    perfFolder.rowType = TraceRow.ROW_TYPE_PERF_TOOL_GROUP;
    perfFolder.rowParentId = '';
    perfFolder.style.height = '40px';
    perfFolder.folder = true;
    perfFolder.name = 'Perf Tools';
    perfFolder.favoriteChangeHandler = this.trace.favoriteChangeHandler;
    perfFolder.selectChangeHandler = this.trace.selectChangeHandler;
    perfFolder.supplier = (): Promise<any[]> => new Promise<Array<any>>((resolve) => resolve([]));
    perfFolder.onThreadHandler = (useCache): void => {
      perfFolder.canvasSave(this.trace.canvasPanelCtx!);
      if (perfFolder.expansion) {
        this.trace.canvasPanelCtx?.clearRect(0, 0, perfFolder.frame.width, perfFolder.frame.height);
      } else {
        (renders['empty'] as EmptyRender).renderMainThread(
          {
            context: this.trace.canvasPanelCtx,
            useCache: useCache,
            type: '',
          },
          perfFolder
        );
      }
      perfFolder.canvasRestore(this.trace.canvasPanelCtx!, this.trace);
    };
    return perfFolder;
  }
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

import { BaseStruct, dataFilterHandler, drawLoadingFrame, drawString, isFrameContainPoint, Render } from './ProcedureWorkerCommon';
import { TraceRow } from '../../component/trace/base/TraceRow';
import { ColorUtils } from '../../component/trace/base/ColorUtils';
import {SpSystemTrace} from "../../component/SpSystemTrace";

export class PerfToolRender extends Render {
  renderMainThread(
    perfReq: {
      context: CanvasRenderingContext2D;
      useCache: boolean;
      type: string;
      index: number;
    },
    row: TraceRow<PerfToolStruct>
  ) {
    PerfToolStruct.index = perfReq.index;
    let perfToolList = row.dataList;
    let perfToolFilter = row.dataListCache;
    dataFilterHandler(perfToolList, perfToolFilter, {
      startKey: 'startNS',
      durKey: 'dur',
      startNS: TraceRow.range?.startNS ?? 0,
      endNS: TraceRow.range?.endNS ?? 0,
      totalNS: TraceRow.range?.totalNS ?? 0,
      frame: row.frame,
      paddingTop: 5,
      useCache: perfReq.useCache || !(TraceRow.range?.refresh ?? false),
    });
    drawLoadingFrame(perfReq.context, perfToolFilter, row);
    perfReq.context.beginPath();
    let find = false;
    for (let re of perfToolFilter) {
      PerfToolStruct.draw(perfReq.context, re);
      if (row.isHover && re.frame && isFrameContainPoint(re.frame, row.hoverX, row.hoverY)) {
        PerfToolStruct.hoverPerfToolStruct = re;
        find = true;
      }
    }
    if (!find && row.isHover) PerfToolStruct.hoverPerfToolStruct = undefined;
    perfReq.context.closePath();
  }
}
export function PerfToolsStructOnClick(clickRowType: string, sp: SpSystemTrace) {
  return new Promise((resolve, reject) => {
    if (clickRowType === TraceRow.ROW_TYPE_PERF_TOOL && PerfToolStruct.hoverPerfToolStruct) {
      PerfToolStruct.selectPerfToolStruct = PerfToolStruct.hoverPerfToolStruct;
      sp.traceSheetEL?.displayPerfToolsData(PerfToolStruct.selectPerfToolStruct);
      sp.timerShaftEL?.modifyFlagList(undefined);
      reject(new Error());
    }else{
      resolve(null);
    }
  });
}
export class PerfToolStruct extends BaseStruct {
  static hoverPerfToolStruct: PerfToolStruct | undefined;
  static selectPerfToolStruct: PerfToolStruct | undefined;
  static index = 0;
  count: string | undefined;
  startNS: number | undefined;
  dur: number | undefined; //自补充，数据库没有返回
  id: number | undefined;
  name: string | undefined;

  static draw(PerfContext: CanvasRenderingContext2D, data: PerfToolStruct) {
    if (data.frame) {
      let width = data.frame.width || 0;
      PerfContext.globalAlpha = 1;
      PerfContext.fillStyle = ColorUtils.colorForTid(PerfToolStruct.index);
      PerfContext.fillRect(data.frame.x, data.frame.y, width, data.frame.height);
      if (data.frame.width > 7) {
        PerfContext.textBaseline = 'middle';
        PerfContext.lineWidth = 1;
        let countText: string | undefined = '';
        if (data.count) {
          countText = `${data.count}`;
        }
        PerfContext.fillStyle = ColorUtils.funcTextColor('#000');
        drawString(PerfContext, countText, 2, data.frame, data);
      }
      if (data.id == PerfToolStruct.selectPerfToolStruct?.id &&
        data.name == PerfToolStruct.selectPerfToolStruct?.name) {
          PerfContext.strokeStyle = '#000';
          PerfContext.lineWidth = 2;
          PerfContext.strokeRect(data.frame.x, data.frame.y + 1, data.frame.width, data.frame.height - 2);
      }
    }
  }

  static isHover(clock: PerfToolStruct) {
    return clock === PerfToolStruct.hoverPerfToolStruct || clock === PerfToolStruct.selectPerfToolStruct;
  }
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

import { BaseStruct, dataFilterHandler, drawLoadingFrame, drawString, isFrameContainPoint, Render } from './ProcedureWorkerCommon';
import { TraceRow } from '../../component/trace/base/TraceRow';
import { ColorUtils } from '../../component/trace/base/ColorUtils';
import {SpSystemTrace} from "../../component/SpSystemTrace";

export class PerfToolRender extends Render {
  renderMainThread(
    perfReq: {
      context: CanvasRenderingContext2D;
      useCache: boolean;
      type: string;
      index: number;
    },
    row: TraceRow<PerfToolStruct>
  ) {
    PerfToolStruct.index = perfReq.index;
    let perfToolList = row.dataList;
    let perfToolFilter = row.dataListCache;
    dataFilterHandler(perfToolList, perfToolFilter, {
      startKey: 'startNS',
      durKey: 'dur',
      startNS: TraceRow.range?.startNS ?? 0,
      endNS: TraceRow.range?.endNS ?? 0,
      totalNS: TraceRow.range?.totalNS ?? 0,
      frame: row.frame,
      paddingTop: 5,
      useCache: perfReq.useCache || !(TraceRow.range?.refresh ?? false),
    });
    drawLoadingFrame(perfReq.context, perfToolFilter, row);
    perfReq.context.beginPath();
    let find = false;
    for (let re of perfToolFilter) {
      PerfToolStruct.draw(perfReq.context, re);
      if (row.isHover && re.frame && isFrameContainPoint(re.frame, row.hoverX, row.hoverY)) {
        PerfToolStruct.hoverPerfToolStruct = re;
        find = true;
      }
    }
    if (!find && row.isHover) PerfToolStruct.hoverPerfToolStruct = undefined;
    perfReq.context.closePath();
  }
}
export function PerfToolsStructOnClick(clickRowType: string, sp: SpSystemTrace) {
  return new Promise((resolve, reject) => {
    if (clickRowType === TraceRow.ROW_TYPE_PERF_TOOL && PerfToolStruct.hoverPerfToolStruct) {
      PerfToolStruct.selectPerfToolStruct = PerfToolStruct.hoverPerfToolStruct;
      sp.traceSheetEL?.displayPerfToolsData(PerfToolStruct.selectPerfToolStruct);
      sp.timerShaftEL?.modifyFlagList(undefined);
      reject(new Error());
    }else{
      resolve(null);
    }
  });
}
export class PerfToolStruct extends BaseStruct {
  static hoverPerfToolStruct: PerfToolStruct | undefined;
  static selectPerfToolStruct: PerfToolStruct | undefined;
  static index = 0;
  count: string | undefined;
  startNS: number | undefined;
  dur: number | undefined; //自补充，数据库没有返回
  id: number | undefined;
  name: string | undefined;

  static draw(PerfContext: CanvasRenderingContext2D, data: PerfToolStruct) {
    if (data.frame) {
      let width = data.frame.width || 0;
      PerfContext.globalAlpha = 1;
      PerfContext.fillStyle = ColorUtils.colorForTid(PerfToolStruct.index);
      PerfContext.fillRect(data.frame.x, data.frame.y, width, data.frame.height);
      if (data.frame.width > 7) {
        PerfContext.textBaseline = 'middle';
        PerfContext.lineWidth = 1;
        let countText: string | undefined = '';
        if (data.count) {
          countText = `${data.count}`;
        }
        PerfContext.fillStyle = ColorUtils.funcTextColor('#000');
        drawString(PerfContext, countText, 2, data.frame, data);
      }
      if (data.id == PerfToolStruct.selectPerfToolStruct?.id &&
        data.name == PerfToolStruct.selectPerfToolStruct?.name) {
          PerfContext.strokeStyle = '#000';
          PerfContext.lineWidth = 2;
          PerfContext.strokeRect(data.frame.x, data.frame.y + 1, data.frame.width, data.frame.height - 2);
      }
    }
  }

  static isHover(clock: PerfToolStruct) {
    return clock === PerfToolStruct.hoverPerfToolStruct || clock === PerfToolStruct.selectPerfToolStruct;
  }
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

import { BaseStruct, dataFilterHandler, drawLoadingFrame, drawString, isFrameContainPoint, Render } from './ProcedureWorkerCommon';
import { TraceRow } from '../../component/trace/base/TraceRow';
import { ColorUtils } from '../../component/trace/base/ColorUtils';
import {SpSystemTrace} from "../../component/SpSystemTrace";

export class PerfToolRender extends Render {
  renderMainThread(
    perfReq: {
      context: CanvasRenderingContext2D;
      useCache: boolean;
      type: string;
      index: number;
    },
    row: TraceRow<PerfToolStruct>
  ) {
    PerfToolStruct.index = perfReq.index;
    let perfToolList = row.dataList;
    let perfToolFilter = row.dataListCache;
    dataFilterHandler(perfToolList, perfToolFilter, {
      startKey: 'startNS',
      durKey: 'dur',
      startNS: TraceRow.range?.startNS ?? 0,
      endNS: TraceRow.range?.endNS ?? 0,
      totalNS: TraceRow.range?.totalNS ?? 0,
      frame: row.frame,
      paddingTop: 5,
      useCache: perfReq.useCache || !(TraceRow.range?.refresh ?? false),
    });
    drawLoadingFrame(perfReq.context, perfToolFilter, row);
    perfReq.context.beginPath();
    let find = false;
    for (let re of perfToolFilter) {
      PerfToolStruct.draw(perfReq.context, re);
      if (row.isHover && re.frame && isFrameContainPoint(re.frame, row.hoverX, row.hoverY)) {
        PerfToolStruct.hoverPerfToolStruct = re;
        find = true;
      }
    }
    if (!find && row.isHover) PerfToolStruct.hoverPerfToolStruct = undefined;
    perfReq.context.closePath();
  }
}
export function PerfToolsStructOnClick(clickRowType: string, sp: SpSystemTrace) {
  return new Promise((resolve, reject) => {
    if (clickRowType === TraceRow.ROW_TYPE_PERF_TOOL && PerfToolStruct.hoverPerfToolStruct) {
      PerfToolStruct.selectPerfToolStruct = PerfToolStruct.hoverPerfToolStruct;
      sp.traceSheetEL?.displayPerfToolsData(PerfToolStruct.selectPerfToolStruct);
      sp.timerShaftEL?.modifyFlagList(undefined);
      reject(new Error());
    }else{
      resolve(null);
    }
  });
}
export class PerfToolStruct extends BaseStruct {
  static hoverPerfToolStruct: PerfToolStruct | undefined;
  static selectPerfToolStruct: PerfToolStruct | undefined;
  static index = 0;
  count: string | undefined;
  startNS: number | undefined;
  dur: number | undefined; //自补充，数据库没有返回
  id: number | undefined;
  name: string | undefined;

  static draw(PerfContext: CanvasRenderingContext2D, data: PerfToolStruct) {
    if (data.frame) {
      let width = data.frame.width || 0;
      PerfContext.globalAlpha = 1;
      PerfContext.fillStyle = ColorUtils.colorForTid(PerfToolStruct.index);
      PerfContext.fillRect(data.frame.x, data.frame.y, width, data.frame.height);
      if (data.frame.width > 7) {
        PerfContext.textBaseline = 'middle';
        PerfContext.lineWidth = 1;
        let countText: string | undefined = '';
        if (data.count) {
          countText = `${data.count}`;
        }
        PerfContext.fillStyle = ColorUtils.funcTextColor('#000');
        drawString(PerfContext, countText, 2, data.frame, data);
      }
      if (data.id == PerfToolStruct.selectPerfToolStruct?.id &&
        data.name == PerfToolStruct.selectPerfToolStruct?.name) {
          PerfContext.strokeStyle = '#000';
          PerfContext.lineWidth = 2;
          PerfContext.strokeRect(data.frame.x, data.frame.y + 1, data.frame.width, data.frame.height - 2);
      }
    }
  }

  static isHover(clock: PerfToolStruct) {
    return clock === PerfToolStruct.hoverPerfToolStruct || clock === PerfToolStruct.selectPerfToolStruct;
  }
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

import { SpSystemTrace } from '../SpSystemTrace';
import { TraceRow } from '../trace/base/TraceRow';
import { renders } from '../../database/ui-worker/ProcedureWorker';
import { info } from '../../../log/Log';
import { PerfToolRender, PerfToolStruct } from '../../database/ui-worker/ProcedureWorkerPerfTool';
import { ColorUtils } from '../trace/base/ColorUtils';
import { EmptyRender } from '../../database/ui-worker/cpu/ProcedureWorkerCPU';
import { Utils } from '../trace/base/Utils';
import { clockDataSender } from '../../database/data-trafic/ClockDataSender';
import { queryPerfOutputData } from '../../database/sql/SqlLite.sql';

export class SpPerfOutputDataChart {
  private trace: SpSystemTrace;
  private startTime: number | undefined;
  private perfOutputArr: Array<string> | undefined;
  private dur: number | undefined;
  private perfName: string | undefined;

  constructor(trace: SpSystemTrace) {
    this.trace = trace;
  }

  async init(): Promise<void> {
    let perfOutputData = await queryPerfOutputData();
    if(perfOutputData.length === 0) {
      return;
    }
    this.perfName = perfOutputData[0].name;
    this.perfOutputArr = perfOutputData[0].name.split(':')[2].split(',');
    let endTime: number = perfOutputData[0].ts;
    this.dur = Number(this.perfOutputArr![this.perfOutputArr!.length -2]);
    this.startTime = endTime - window.recordStartNS - this.dur ;
    let folder = await this.initFolder();
    this.trace.rowsEL?.appendChild(folder);
    this.initData(folder);
  }

  private clockThreadHandler(
    traceRow: TraceRow<PerfToolStruct>,
    it: {
      name: string;
    },
    perfId: number
  ): void {
    traceRow.onThreadHandler = (useCache): void => {
      let context: CanvasRenderingContext2D;
      if (traceRow.currentContext) {
        context = traceRow.currentContext;
      } else {
        context = traceRow.collect ? this.trace.canvasFavoritePanelCtx! : this.trace.canvasPanelCtx!;
      }
      traceRow.canvasSave(context);
      (renders['perfTool'] as PerfToolRender).renderMainThread(
        {
          context: context,
          useCache: useCache,
          type: it.name,
          index: perfId,
        },
        traceRow
      );
      traceRow.canvasRestore(context, this.trace);
    };
  }

  async initData(folder: TraceRow<any>): Promise<void> {
    let perfToolStartTime = new Date().getTime();
    let perfToolList = [
      { name: 'Application Process CPU Power Consumption(MAS)', idx: 26 }, 
      { name: 'RS Process CPU Power Consumption(MAS)', idx: 27 }, 
      { name: 'Media Process CPU Power Consumption(MAS)', idx: 28 },
      { name: 'Foundation Process CPU Power Consumption(MAS)', idx: 29 },
      { name: 'Gpu Power Consumption(MAS)', idx: 30 },
      { name: 'DDR Power Consumption(MAS)', idx: 31 },
      { name: 'IO Count', idx: 34 }, 
      { name: 'Block Count', idx: 35 },
      { name: 'IPI Count(Application Main Thread)', idx: 50 }, 
      { name: 'IPI Count(RS)', idx: 51 }];
    info('perfTools data size is: ', perfToolList!.length);
    for (let i = 0; i < perfToolList.length; i++) {
      const it = perfToolList[i];
      let traceRow = TraceRow.skeleton<PerfToolStruct>();
      traceRow.rowId = i+'';
      traceRow.rowType = TraceRow.ROW_TYPE_PERF_TOOL;
      traceRow.rowParentId = folder.rowId;
      traceRow.style.height = '40px';
      traceRow.name = it.name;
      traceRow.rowHidden = !folder.expansion;
      traceRow.setAttribute('children', '');
      traceRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
      traceRow.selectChangeHandler = this.trace.selectChangeHandler;
      traceRow.supplierFrame = (): Promise<PerfToolStruct[]> => {
        let data = new PerfToolStruct();
        data.startNS = this.startTime;
        data.dur = this.dur;
        data.count = this.perfOutputArr![it.idx];
        data.id = i + 1;
        data.name = it.name;
        return new Promise<Array<any>>((resolve) => resolve([data]));
      };
      traceRow.findHoverStruct = (): void => {
        PerfToolStruct.hoverPerfToolStruct = traceRow.getHoverStruct();
      };
      this.clockThreadHandler(traceRow, it, i);
      folder.addChildTraceRow(traceRow);
    }
    let durTime = new Date().getTime() - perfToolStartTime;
    info('The time to load the ClockData is: ', durTime);
  }

  async initFolder(): Promise<TraceRow<any>> {
    let perfFolder = TraceRow.skeleton();
    perfFolder.rowId = 'perfTool';
    perfFolder.index = 0;
    perfFolder.rowType = TraceRow.ROW_TYPE_PERF_TOOL_GROUP;
    perfFolder.rowParentId = '';
    perfFolder.style.height = '40px';
    perfFolder.folder = true;
    perfFolder.name = 'Perf Tools';
    perfFolder.favoriteChangeHandler = this.trace.favoriteChangeHandler;
    perfFolder.selectChangeHandler = this.trace.selectChangeHandler;
    perfFolder.supplier = (): Promise<any[]> => new Promise<Array<any>>((resolve) => resolve([]));
    perfFolder.onThreadHandler = (useCache): void => {
      perfFolder.canvasSave(this.trace.canvasPanelCtx!);
      if (perfFolder.expansion) {
        this.trace.canvasPanelCtx?.clearRect(0, 0, perfFolder.frame.width, perfFolder.frame.height);
      } else {
        (renders['empty'] as EmptyRender).renderMainThread(
          {
            context: this.trace.canvasPanelCtx,
            useCache: useCache,
            type: '',
          },
          perfFolder
        );
      }
      perfFolder.canvasRestore(this.trace.canvasPanelCtx!, this.trace);
    };
    return perfFolder;
  }
}

