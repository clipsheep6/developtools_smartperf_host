// Copyright (c) 2024 Huawei Device Co., Ltd.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import { CHART_OFFSET_LEFT, MAX_COUNT, QueryEnum, threadStateToString, TraficEnum } from './utils/QueryEnum';
import { getThreadPool } from '../SqlLite';
import { TraceRow } from '../../component/trace/base/TraceRow';
import { Utils } from '../../component/trace/base/Utils';
import { AppStartupRStruct } from '../ui-worker/ProcedureWorkerAppStartupR';
export function appStartupThreadRuningDataSender(
  list: unknown,
  row: TraceRow<AppStartupRStruct>,
  traceId?: string
): Promise<AppStartupRStruct[] | boolean> {
  let trafic: number = TraficEnum.Memory;
  let width = row.clientWidth - CHART_OFFSET_LEFT;
  if (trafic === TraficEnum.SharedArrayBuffer && !row.sharedArrayBuffers) {
    row.sharedArrayBuffers = {
      startTs: new SharedArrayBuffer(Float64Array.BYTES_PER_ELEMENT * MAX_COUNT),
      dur: new SharedArrayBuffer(Float64Array.BYTES_PER_ELEMENT * MAX_COUNT),
      cpu: new SharedArrayBuffer(Int8Array.BYTES_PER_ELEMENT * MAX_COUNT),
      id: new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * MAX_COUNT),
      tid: new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * MAX_COUNT),
      state: new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * MAX_COUNT),
      pid: new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * MAX_COUNT),
      startName: new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * MAX_COUNT),
      argSetID: new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT * MAX_COUNT),
    };
  }
  return new Promise((resolve): void => {
    getThreadPool(traceId).submitProto(
      QueryEnum.AppStartupThreadRuningData,
      {
        startNS: TraceRow.range?.startNS || 0,
        endNS: TraceRow.range?.endNS || 0,
        recordStartNS: Utils.getInstance().getRecordStartNS(traceId),
        recordEndNS: Utils.getInstance().getRecordEndNS(traceId),
        list: list,
        width: width,
        trafic: trafic,
        sharedArrayBuffers: row.sharedArrayBuffers,
      },
      (res: unknown, len: number, transfer: boolean, isEmpty: boolean): void => {
        if (isEmpty) {
          resolve(true);
        } else {
          resolve(arrayBufferHandler(transfer ? res : row.sharedArrayBuffers, len));
        }
      }
    );
  });
}
function arrayBufferHandler(buffers: unknown, len: number): AppStartupRStruct[] {
  let outArr: AppStartupRStruct[] = []; //@ts-ignore
  let startTs = new Float64Array(buffers.startTs); //@ts-ignore
  let dur = new Float64Array(buffers.dur); //@ts-ignore
  let cpu = new Int8Array(buffers.cpu); //@ts-ignore
  let id = new Int32Array(buffers.id); //@ts-ignore
  let tid = new Int32Array(buffers.tid); //@ts-ignore
  let state = new Int32Array(buffers.state); //@ts-ignore
  let pid = new Int32Array(buffers.pid); //@ts-ignore
  let startName = new Int32Array(buffers.startName);//@ts-ignore
  let argSetID = new Int32Array(buffers.argSetID);//@ts-ignore
  for (let i = 0; i < len; i++) {
    outArr.push({
      startTs: startTs[i],
      dur: dur[i],
      cpu: cpu[i],
      id: id[i],
      tid: tid[i],
      state: threadStateToString(state[i]),
      pid: pid[i],
      startName: startName[i],
      argSetID: argSetID[i],
    } as unknown as AppStartupRStruct);
  }
  return outArr;
}