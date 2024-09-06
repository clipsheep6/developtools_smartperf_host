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

import { BaseStruct, dataFilterHandler, drawLoadingFrame, drawString } from './ProcedureWorkerCommon';
import { TraceRow } from '../../component/trace/base/TraceRow';
import { ColorUtils } from '../../component/trace/base/ColorUtils';
import { SpSystemTrace } from '../../component/SpSystemTrace';
import { Utils } from '../../component/trace/base/Utils';
import { AppStartupStruct } from './ProcedureWorkerAppStartup';

export class AppStartupRunningRender {
  renderMainThread(
    appStartReq: {
      useCache: boolean;
      appStartupContext: CanvasRenderingContext2D;
      type: string;
    },
    appStartUpRow: TraceRow<AppStartupRStruct>
  ): void {
    let list = appStartUpRow.dataList;
    let appStartUpfilter = appStartUpRow.dataListCache;
    dataFilterHandler(list, appStartUpfilter, {
      startKey: 'startTs',
      durKey: 'dur',
      startNS: TraceRow.range?.startNS ?? 0,
      endNS: TraceRow.range?.endNS ?? 0,
      totalNS: TraceRow.range?.totalNS ?? 0,
      frame: appStartUpRow.frame,
      paddingTop: 5,
      useCache: appStartReq.useCache || !(TraceRow.range?.refresh ?? false),
    });
    drawLoadingFrame(appStartReq.appStartupContext, appStartUpRow.dataListCache, appStartUpRow);
    appStartReq.appStartupContext.globalAlpha = 0.6;
    let find = false;
    let offset = 3;
    for (let re of appStartUpfilter) {
      AppStartupRStruct.draw(appStartReq.appStartupContext, re);
      if (appStartUpRow.isHover) {
        if (
          re.frame &&
          appStartUpRow.hoverX >= re.frame.x - offset &&
          appStartUpRow.hoverX <= re.frame.x + re.frame.width + offset
        ) {
          AppStartupRStruct.hoverStartupStruct = re;
          find = true;
        }
      }
    }
    if (!find && appStartUpRow.isHover) {
      AppStartupRStruct.hoverStartupStruct = undefined;
    }
  }
}

export function AppStartupStructOnClick(
  clickRowType: string,
  sp: SpSystemTrace,
  scrollToFuncHandler: Function,
  entry?: AppStartupRStruct,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (clickRowType === TraceRow.ROW_TYPE_APP_STARTUP && (AppStartupRStruct.hoverStartupStruct || entry)) {
      AppStartupRStruct.selectStartupStruct = entry || AppStartupRStruct.hoverStartupStruct;
      // sp.traceSheetEL?.displayStartupData(
      //   AppStartupRStruct.selectStartupStruct!,
      //   scrollToFuncHandler,
      //   sp.currentRow!.dataListCache
      // );
      sp.timerShaftEL?.modifyFlagList(undefined);
      reject(new Error());
    } else {
      resolve(null);
    }
  });
}
export class AppStartupRStruct extends BaseStruct {
  static hoverStartupStruct: AppStartupRStruct | undefined;
  static selectStartupStruct: AppStartupRStruct | undefined;
  cpuText: string | undefined;
  processText: string | undefined;
  threadText: string | undefined;
  measurePWidth: number = 0;
  measureTWidth: number = 0;
  measureCWidth: number = 0;
  startTs: number | undefined;
  startName: number = 0;
  dur: number | undefined;
  value: string | undefined;
  pid: number | undefined;
  process: string | undefined;
  tid: number | undefined;
  itid: number | undefined;
  stepName: string | undefined;
  processName: string | undefined;
	threadName: string | undefined;
  id: number | undefined;
  cpu: number | undefined;
	startupName: string | undefined;



  static draw(ctx: CanvasRenderingContext2D, data: AppStartupRStruct): void {
    if (data.frame) {
      ctx.globalAlpha = 1.0;
      ctx.fillStyle = ColorUtils.colorForTid(data.startName!);
      ctx.fillRect(data.frame.x, data.frame.y, data.frame.width, data.frame.height);
      if (data.frame.width > 7) {
        ctx.textBaseline = 'middle';
        ctx.lineWidth = 1;
        if (data.stepName === undefined) {
          data.stepName = `${AppStartupStruct.getStartupName(data.startName)} (${(data.dur! / 1000000).toFixed(2)}ms)`;
        }
        let textColor =
          ColorUtils.FUNC_COLOR[ColorUtils.hashFunc(String(data.stepName) || '', 0, ColorUtils.FUNC_COLOR.length)];
        ctx.fillStyle = ColorUtils.funcTextColor(textColor);
        AppStartupRStruct.drawText(ctx, data, data.frame.width)
      }
      if (data === AppStartupRStruct.selectStartupStruct) {
        ctx.strokeStyle = '#232c5d';
        ctx.lineWidth = 2;
        ctx.strokeRect(data.frame.x, data.frame.y, data.frame.width, data.frame.height);
      }
    }
  }

  static drawText(ctx: CanvasRenderingContext2D, data: AppStartupRStruct, width: number): void {
    let textFillWidth = width - textPadding * 2;
    if (data.frame && textFillWidth > 3) {
      if (data.cpuText === undefined) {
        data.cpuText = `CPU${data.cpu }`;
        data.measureCWidth = ctx.measureText(data.cpuText).width;
      }
      if (data.processText === undefined) {
        data.processText = `${data.processName || 'Process'} [${data.pid}]`;
        data.measurePWidth = ctx.measureText(data.processText).width;
      }
      if (data.threadText === undefined) {
        data.threadText = `${data.threadName || 'Thread'} [${data.tid}]`;
        data.measureTWidth = ctx.measureText(data.threadText).width;
      }
      let processCharWidth = Math.round(data.measurePWidth / data.processText.length);
      let threadCharWidth = Math.round(data.measureTWidth / data.threadText.length);
      let cpuCharWidth = Math.round(data.measureCWidth / data.threadText.length);
      // ctx.fillStyle = ColorUtils.funcTextColor(ColorUtils.colorForTid(data.pid! > 0 ? data.pid! : data.tid!));
      let cY = data.frame.y;
      ctx.font = 'bold 9px sans-serif';
      ctx.textBaseline = 'top';
      if (data.measureCWidth < textFillWidth) {
        let x2 = Math.floor(width / 2 - data.measureCWidth / 2 + data.frame.x + textPadding);
        ctx.fillText(data.cpuText, x2, cY + 2, textFillWidth);
      } else {
        if (textFillWidth >= cpuCharWidth) {
          let chatNum = textFillWidth / cpuCharWidth;
          let x1 = data.frame.x + textPadding;
          if (chatNum < 2) {
            ctx.fillText(data.threadText.substring(0, 1), x1, cY + 2, textFillWidth);
          } else {
            ctx.fillText( `${data.threadText.substring(0, chatNum - 1)}...`, x1, cY + 2, textFillWidth);
          }
        }
      }
      let pY = data.frame.height / 2 + data.frame.y;
      ctx.font = '9px sans-serif';
      ctx.textBaseline = 'middle';
      if (data.measurePWidth < textFillWidth) {
        let x1 = Math.floor(width / 2 - data.measurePWidth / 2 + data.frame.x + textPadding);
        ctx.fillText(data.processText, x1, pY + 2, textFillWidth);
      } else {
        if (textFillWidth >= processCharWidth) {
          let chatNum = textFillWidth / processCharWidth;
          let x1 = data.frame.x + textPadding;
          if (chatNum < 2) {
            ctx.fillText(data.processText.substring(0, 1), x1, pY, textFillWidth);
          } else {
            ctx.fillText(`${data.processText.substring(0, chatNum - 1)}...`, x1, pY, textFillWidth);
          }
        }
      }
      let tY = data.frame.height + data.frame.y;
      ctx.textBaseline = 'bottom';
      if (data.measureTWidth < textFillWidth) {
        let x2 = Math.floor(width / 2 - data.measureTWidth / 2 + data.frame.x + textPadding);
        ctx.fillText(data.threadText, x2, tY, textFillWidth);
      } else {
        if (textFillWidth >= threadCharWidth) {
          let chatNum = textFillWidth / threadCharWidth;
          let x1 = data.frame.x + textPadding;
          if (chatNum < 2) {
            ctx.fillText(data.threadText.substring(0, 1), x1, tY, textFillWidth);
          } else {
            ctx.fillText( `${data.threadText.substring(0, chatNum - 1)}...`, x1, tY, textFillWidth);
          }
        }
      }
    }
  }
}
const textPadding = 2;
