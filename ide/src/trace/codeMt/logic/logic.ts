/*
 * Copyright (C) 2023 Huawei Device Co., Ltd.
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

import { BaseElement, element } from '../../../../../base-ui/BaseElement';
import { LitCheckBox } from '../../../../../base-ui/checkbox/LitCheckBox';
import '../../../../../base-ui/checkbox/LitCheckBox';
import { LitTable } from '../../../../../base-ui/table/lit-table';
import '../../../../../base-ui/popover/LitPopoverV';
import { LitPopover } from '../../../../../base-ui/popover/LitPopoverV';
import { SelectionData, SelectionParam } from '../../../../bean/BoxSelection';
import { queryRunningThread, queryCoreRunningThread } from '../../../../database/sql/ProcessThread.sql';
import { ClassifyCoreSettingHtml } from '../TabFfrt.html';
import { TabPaneFilter } from '../TabPaneFilter';


const UNIT: number = 1000000.0;
const NUM_DIGITS: number = 3;
const SMALL_CPU_NUM: Array<number> = [0, 1, 2, 3];
const MID_CPU_NUM12: Array<number> = [4, 5, 6, 7, 8, 9];
const LARGE_CPU_NUM12: Array<number> = [10, 11];

export class CpuStatus {
    cpu: number = 0;
    small: boolean = false;
    medium: boolean = false;
    large: boolean = false;
}
@element('tabpane-time-parallel')
export class TabPaneTimeParallel extends BaseElement {
    private leftStartNs: number = 0;
    private rightEndNs: number = 0;
    //处理未按核分组的数据
    handleAllParallelData(param: any, dataSourceMap: Map<string, any>): void {
        for (let i = 0; i < param.length; i++) {
            let stateItem = param[i];
            if (stateItem.ts < this.leftStartNs) {
                stateItem.ts = this.leftStartNs;
            }
            if (stateItem.endTs > this.rightEndNs) {
                stateItem.endTs = this.rightEndNs;
            }
            let dur = stateItem.endTs - stateItem.ts;
            if (dataSourceMap.has(`${stateItem.pid}`)) {
                let obj = dataSourceMap.get(`${stateItem.pid}`);
                let setArr = new Set(obj.tidArr);
                if (!(setArr.has(stateItem.tid))) {
                    setArr.add(stateItem.tid);
                    obj.tidArr.push(stateItem.tid);
                }
                obj.dur += dur;
                obj!.stateItem.push(stateItem)
            } else {
                dataSourceMap.set(`${stateItem.pid}`, {
                    pid: stateItem.pid,
                    tid: stateItem.tid,
                    title: stateItem.pName ? `${stateItem.pName} ${stateItem.pid}` : `[NULL] ${stateItem.pid}`,
                    tidArr: [stateItem.tid],
                    dur: dur,
                    parallelNum: null,
                    allParallel: null,
                    stateItem: [stateItem],
                    tCount: null,
                    pDur: null,
                    children: []
                });
            };
        };
        this.showTreeChart(dataSourceMap);
    }
    //处理核分组数据
    hanldeGroupParalleData(val: any, key: string, dataSourceMap: Map<string, any>): void {
        let coreMap: Map<string, any> = new Map<string, any>();
        for (let i = 0; i < val.length; i++) {
            let stateItem = val[i];
            if (stateItem.ts < this.leftStartNs) {
                stateItem.ts = this.leftStartNs;
            }
            if (stateItem.endTs > this.rightEndNs) {
                stateItem.endTs = this.rightEndNs;
            }
            let dur = stateItem.endTs - stateItem.ts;
            if (!dataSourceMap.has(`${stateItem.pid}`)) {
                dataSourceMap.set(`${stateItem.pid}`, {
                    pid: stateItem.pid,
                    tid: stateItem.tid,
                    title: stateItem.pName ? `${stateItem.pName} ${stateItem.pid}` : `[NULL] ${stateItem.pid}`,
                    dur: null,
                    parallelNum: null,
                    parallelDur: null,
                    allParallel: null,
                    tCount: null,
                    pDur: null,
                    children: []
                });
            };
            if (coreMap.has(`${stateItem.pid} ${key}`)) {
                let obj = coreMap.get(`${stateItem.pid} ${key}`);
                let setArr = new Set(obj.tidArr);
                if (!(setArr.has(stateItem.tid))) {
                    setArr.add(stateItem.tid);
                    obj.tidArr.push(stateItem.tid);
                }
                obj.dur += dur;
                obj!.stateItem.push(stateItem)
            } else {
                coreMap.set(`${stateItem.pid} ${key}`, {
                    pid: stateItem.pid,
                    tid: stateItem.tid,
                    title: `${key}`,
                    tidArr: [stateItem.tid],
                    dur: dur,
                    parallelNum: null,
                    parallelDur: null,
                    allParallel: null,
                    stateItem: [stateItem],
                    tCount: null,
                    pDur: null,
                    children: []
                });
            };
        };
        this.showCoreTreeChart(coreMap, dataSourceMap)
    }
    //并行度逻辑处理
    hanldParalLogic(value: any, pMap: Map<string, any>): void {
        let arr = value.stateItem;
        let waitArr: any = [];
        // let dumpArr: any = [];
        let globalTs: number = 0;
        let index: number = 0;
        while (index < arr.length || waitArr.length > 0) {
            let minEndTs = Math.min(...waitArr.map((item: any) => item.endTs));
            let minIndex = waitArr.findIndex((item: any) => item.endTs === minEndTs);
            //当waitArr为空时
            if (waitArr.length === 0) {
                globalTs = arr[index].ts;
                waitArr.push(arr[index]);
                index++;
                continue;
            }
            //当全局Ts等于minEndTs时，只做删除处理
            if (globalTs === minEndTs) {
                if (minIndex !== -1) { waitArr.splice(minIndex, 1) };
                continue;
            }
            let list = JSON.parse(JSON.stringify(waitArr));
            let dumpObj = {
                ts: 0,
                endTs: 0,
                listSlice: [],
                len: 0
            }
            //判断原队列的数据是否被用完，即是否为空
            if (index < arr.length) {
                if (arr[index].ts < minEndTs) {
                    if (globalTs === arr[index].ts) {
                        waitArr.push(arr[index]);
                        index++;
                        continue;
                    } else {
                        dumpObj = {
                            ts: globalTs,
                            endTs: arr[index].ts,
                            listSlice: list,
                            len: list.length
                        };
                        // dumpArr.push({ dumpObj });
                        waitArr.push(arr[index]);
                        globalTs = arr[index].ts;
                        index++;
                    }
                } else if (arr[index].ts >= minEndTs) {
                    dumpObj = {
                        ts: globalTs,
                        endTs: minEndTs,
                        listSlice: list,
                        len: list.length
                    };
                    // dumpArr.push({ dumpObj });
                    globalTs = minEndTs;
                    if (minIndex !== -1) { waitArr.splice(minIndex, 1) };
                }
            } else {
                dumpObj = {
                    ts: globalTs,
                    endTs: minEndTs,
                    listSlice: list,
                    len: list.length
                };
                // dumpArr.push({ dumpObj });
                globalTs = minEndTs;
                if (minIndex !== -1) { waitArr.splice(minIndex, 1) };
            }
            // value.dumpArr = dumpArr;
            let pDur = dumpObj.endTs - dumpObj.ts;
            let pSlice = ((dumpObj.len * pDur) / value.dur) * 100;
            if (pMap.has(dumpObj.len.toString())) {
                let pObj = pMap.get(dumpObj.len.toString());
                pObj.allParallel += pSlice;
                pObj.pDur += pDur;
                pObj.parallelDur = `${((pObj.pDur) / UNIT).toFixed(NUM_DIGITS)}`;
            } else {
                if (dumpObj.len !== 1) {
                    pMap.set(dumpObj.len.toString(), {
                        pid: null,
                        tid: null,
                        title: '',
                        tidArr: value.tidArr,
                        dur: null,
                        allParallel: pSlice,
                        parallelNum: dumpObj.len,
                        parallelDur: ((pDur) / UNIT).toFixed(NUM_DIGITS),
                        pDur: pDur,
                        stateItem: value.stateItem,
                        tCount: null,
                        children: []
                    })
                }
            }
        }
    }
} 
   
