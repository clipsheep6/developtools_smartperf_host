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
import { LitButton } from '../../../../../base-ui/button/LitButton';
import { LitCheckBox } from '../../../../../base-ui/checkbox/LitCheckBox';
import '../../../../../base-ui/checkbox/LitCheckBox';
import { LitTable, RedrawTreeForm } from '../../../../../base-ui/table/lit-table';
import { SelectionData, SelectionParam } from '../../../../bean/BoxSelection';
import { Utils } from '../../base/Utils';
import { resizeObserver } from '../SheetUtils';
import { LitChartColumn } from '../../../../../base-ui/chart/column/LitChartColumn';
import { queryRunningThread } from '../../../../database/sql/ProcessThread.sql';
import { log } from '../../../../../log/Log';
import { ClassifyCoreSettingHtml } from '../../sheet/TabFfrt.html';

const UNIT: number = 1000000.0;
const NUM_DIGITS: number = 3;

export class CpuStatus {
    cpu: number = 0;
    big: boolean = false;
    middle: boolean = true;
    small: boolean = false;
}
@element('tabpane-ffrt')
export class TabFfrt extends BaseElement {
    private ffrtTbl: LitTable | null | undefined;
    private coreSettingTbl: HTMLDivElement | null | undefined;
    private selectionParam: SelectionParam | undefined;
    private threadMap: Map<string, any> = new Map<string, any>();
    private midCores: number[] = [];
    private bigCores: number[] = [];
    private smallCores: number[] = [];
    private initStatus: boolean = false;

    set data(threadStatesParam: SelectionParam) {
        this.selectionParam = threadStatesParam;
        //每次新款选线程时清空Map对象
        this.threadMap.clear();
        this.ffrtTbl!.recycleDataSource = [];
        this.initThreadStateData(this.selectionParam);
    }
    initElements(): void {
        this.ffrtTbl = this.shadowRoot!.querySelector<LitTable>('#tb-parallel');
        this.coreSettingTbl = this.shadowRoot!.querySelector<HTMLDivElement>('#tb_core_setting');
        this.shadowRoot!.querySelector<HTMLDivElement>('#core-mining')!.onclick = (e): void => {
            this.createCoreTableLine()
        }
    }

    //获取每次被框选线程对应的state数据
    async initThreadStateData(threadParam: SelectionParam | null | undefined): Promise<void> {
        let leftStartNs: number = threadParam!.leftNs + threadParam!.recordStartNs;
        let rightEndNs: number = threadParam!.rightNs + threadParam!.recordStartNs;
        let processIds: Array<number> = [...new Set(threadParam!.processIds)];
        let res: any = await queryRunningThread(processIds, threadParam!.threadIds, leftStartNs, rightEndNs);
        for (let i = 0; i < res.length; i++) {
            let stateItem = res[i];
            if (stateItem.ts < leftStartNs) {
                stateItem.ts = leftStartNs;
            }
            if (stateItem.endTs > rightEndNs) {
                stateItem.endTs = rightEndNs;
            }
            let dur = stateItem.endTs - stateItem.ts;
            if (this.threadMap.has(`${stateItem.pid}`)) {
                let obj = this.threadMap.get(`${stateItem.pid}`);
                let setArr = new Set(obj.tidArr);
                if (!(setArr.has(stateItem.tid))) {
                    setArr.add(stateItem.tid);
                    obj.tidArr.push(stateItem.tid);
                }
                obj.dur += dur;
                obj!.stateItem.push(stateItem)
            } else {
                this.threadMap.set(`${stateItem.pid}`, {
                    pid: stateItem.pid,
                    tid: stateItem.tid,
                    process: stateItem.pName ? stateItem.pName : '[NULL]',
                    tidArr: [stateItem.tid],
                    dur: dur,
                    parallel: null,
                    allParallel: null,
                    stateItem: [stateItem],
                    tCount: null,
                    duration: null,
                    pDur: null,
                    children: []
                });
            };
        };
        this.handleParallelTreeData();
    }
    handleParallelTreeData() {
        for (let [key, value] of this.threadMap) {
            let pMap: Map<string, any> = new Map<string, any>();
            let arr = value.stateItem;
            let waitArr: any = [];
            let dumpArr: any = [];
            let globalTs: number = 0;
            let index: number = 0;
            value.tCount = value.tidArr.length;
            value.duration = (value.dur / UNIT).toFixed(NUM_DIGITS);
            while (index < arr.length || waitArr.length > 0) {
                let minEndTs = Math.min(...waitArr.map((item: any) => item.endTs));
                let minIndex = waitArr.findIndex((item: any) => item.endTs === minEndTs);
                if (waitArr.length === 0) {
                    globalTs = arr[index].ts;
                    waitArr.push(arr[index]);
                    index++;
                    continue;
                }
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
                if (index < arr.length) {
                    if (arr[index].ts < minEndTs) {
                        if (globalTs === arr[index].ts) {
                            waitArr.push(arr[index]);
                            globalTs = arr[index].ts;
                            index++;
                            continue;
                        } else {
                            dumpObj = {
                                ts: globalTs,
                                endTs: arr[index].ts,
                                listSlice: list,
                                len: list.length
                            };
                            dumpArr.push({ dumpObj });
                            waitArr.push(arr[index]);
                            globalTs = arr[index].ts;
                            index++;
                        }
                    } else if (arr[index].ts > minEndTs) {
                        dumpObj = {
                            ts: globalTs,
                            endTs: minEndTs,
                            listSlice: list,
                            len: list.length
                        };
                        dumpArr.push({ dumpObj });
                        globalTs = minEndTs;
                        if (minIndex !== -1) { waitArr.splice(minIndex, 1) };
                    } else if (arr[index].ts === minEndTs) {
                        dumpObj = {
                            ts: globalTs,
                            endTs: arr[index].ts,
                            listSlice: list,
                            len: list.length
                        };
                        dumpArr.push({ dumpObj });
                        waitArr.push(arr[index]);
                        globalTs = arr[index].ts;
                        if (minIndex !== -1) { waitArr.splice(minIndex, 1) };
                        index++;
                    }
                } else {
                    dumpObj = {
                        ts: globalTs,
                        endTs: minEndTs,
                        listSlice: list,
                        len: list.length
                    };
                    dumpArr.push({ dumpObj });
                    globalTs = minEndTs;
                    if (minIndex !== -1) { waitArr.splice(minIndex, 1) };
                }
                value.dumpArr = dumpArr;
                let pDur = dumpObj.endTs - dumpObj.ts;
                let pSlice = ((dumpObj.len * pDur) / value.dur) * 100;
                if (pMap.has(dumpObj.len.toString())) {
                    let pObj = pMap.get(dumpObj.len.toString());
                    pObj.allParallel += pSlice;
                    pObj.pDur += pDur;
                    pObj.parallel = `${dumpObj.len}线程并行：${((pObj.pDur) / UNIT).toFixed(NUM_DIGITS)}`
                } else {
                    pMap.set(dumpObj.len.toString(), {
                        pid: null,
                        tid: null,
                        process: '',
                        tidArr: value.tidArr,
                        dur: value.dur,
                        allParallel: pSlice,
                        parallel: `${dumpObj.len}线程并行：${((pDur) / UNIT).toFixed(NUM_DIGITS)}`,
                        pDur: pDur,
                        stateItem: value.stateItem,
                        tCount: null,
                        duration: null,
                        children: []
                    })
                }
            }
            for (const item of pMap.values()) {
                value.allParallel += item.allParallel;
                item.allParallel = item.allParallel.toFixed(NUM_DIGITS);
            }
            value.allParallel = value.allParallel.toFixed(NUM_DIGITS)
            value.children = [...pMap.values()];
        }
        this.ffrtTbl!.recycleDataSource = [...this.threadMap.values()];
    }

    createCoreTableLine() {
        let coreData: any = [];
        this.coreSettingTbl!.innerHTML = '';
        this.createCoreHeaderDiv();
        for (let i = 0; i < (window as any).cpuCount; i++) {
            let obj = {
                cpu: i,
                // @ts-ignore
                big: this.bigCores.includes(i),
                // @ts-ignore
                middle: this.midCores.includes(i),
                // @ts-ignore
                small: this.smallCores.includes(i),
            };
            coreData.push(obj);
            this.createTableLine(obj);
        }
    }

    initDefaultConfig() {
        if (!this.initStatus) {
            this.midCores = [];
            this.bigCores = [];
            this.smallCores = [];
            for (let i = 0; i < (window as any).cpuCount; i++) {
                this.midCores.push(i);
            }
        }
    }
    createCoreHeaderDiv() {
        let cpuIdLine = document.createElement('div');
        cpuIdLine.className = 'core_line';
        cpuIdLine.style.fontWeight = 'bold';
        cpuIdLine.style.fontSize = '12px'
        cpuIdLine.textContent = 'Cpu Id';
        cpuIdLine.style.textAlign = 'center';
        let bigLine = document.createElement('div');
        bigLine.className = 'core_line';
        bigLine.style.fontWeight = 'bold';
        bigLine.textContent = 'Big';
        bigLine.style.fontSize = '12px';
        bigLine.style.textAlign = 'center';
        let middleLine = document.createElement('div');
        middleLine.className = 'core_line';
        middleLine.style.fontWeight = 'bold';
        middleLine.textContent = 'Middle';
        middleLine.style.fontSize = '12px';
        middleLine.style.textAlign = 'center';
        let smallLine = document.createElement('div');
        smallLine.className = 'core_line';
        smallLine.style.fontWeight = 'bold';
        smallLine.textContent = 'Small';
        smallLine.style.fontSize = '12px';
        smallLine.style.textAlign = 'center';
        this.coreSettingTbl?.append(...[cpuIdLine, bigLine, middleLine, smallLine])
    }

    createTableLine(cpuStatus: CpuStatus) {
        let div = document.createElement('div');
        div.textContent = cpuStatus.cpu + '';
        div.style.textAlign = 'center';
        div.style.fontWeight = 'normal'
        let bigCheckBox: LitCheckBox = new LitCheckBox();
        bigCheckBox.checked = cpuStatus.big;
        bigCheckBox.style.marginLeft = 'auto';  
        bigCheckBox.style.marginRight = 'auto';
        let midCheckBox: LitCheckBox = new LitCheckBox();
        midCheckBox.checked = cpuStatus.middle;
        midCheckBox.style.textAlign = 'center';
        midCheckBox.style.marginLeft = 'auto';  
        midCheckBox.style.marginRight = 'auto';
        let smallCheckBox: LitCheckBox = new LitCheckBox();
        smallCheckBox.checked = cpuStatus.small;
        smallCheckBox.style.textAlign = 'center';
        smallCheckBox.style.marginLeft = 'auto';  
        smallCheckBox.style.marginRight = 'auto';
        bigCheckBox.addEventListener('change', (e) => {
            e.preventDefault();
            midCheckBox.checked = false;
            smallCheckBox.checked = false;
            cpuStatus.big = true;
            this.bigCores.push(cpuStatus.cpu);
            this.midCores = this.midCores.filter((it) => it !== cpuStatus.cpu);
            this.smallCores = this.smallCores.filter((it) => it !== cpuStatus.cpu);
            e.stopPropagation();
        });
        midCheckBox.addEventListener('change', (e: any) => {
            e.preventDefault();
            bigCheckBox.checked = false;
            smallCheckBox.checked = false;
            cpuStatus.middle = true;
            this.midCores.push(cpuStatus.cpu);
            this.bigCores = this.bigCores.filter((it) => it !== cpuStatus.cpu);
            this.smallCores = this.smallCores.filter((it) => it !== cpuStatus.cpu);
            e.stopPropagation();
        });
        smallCheckBox.addEventListener('change', (e: any) => {
            e.preventDefault();
            midCheckBox.checked = false;
            bigCheckBox.checked = false;
            cpuStatus.small = true;
            this.smallCores.push(cpuStatus.cpu);
            this.midCores = this.midCores.filter((it) => it !== cpuStatus.cpu);
            this.bigCores = this.bigCores.filter((it) => it !== cpuStatus.cpu);
            e.stopPropagation();
        });
        this.coreSettingTbl?.append(...[div, bigCheckBox, midCheckBox, smallCheckBox]);
    }

    //回调函数，首次插入DOM时执行的初始化回调
    connectedCallback(): void {
        super.connectedCallback();
        resizeObserver(this.parentElement!, this.ffrtTbl!);
    }
    initHtml(): string {
        return ClassifyCoreSettingHtml;
    }
}
