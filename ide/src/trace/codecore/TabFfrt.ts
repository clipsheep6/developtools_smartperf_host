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
import { ClassifyCoreSettingHtml } from '../../sheet/TabFfrt.html';
import { time } from 'console';

const UNIT: number = 1000000.0;
const NUM_DIGITS: number = 3;

export class CpuStatus {
    cpu: number = 0;
    Large: boolean = false;
    medium: boolean = false;
    small: boolean = false;
}
@element('tabpane-ffrt')
export class TabFfrt extends BaseElement {
    private parallelTable: LitTable | null | undefined;
    private coreParallelTable: LitTable | null | undefined;
    private litPopoverEl: LitPopover | null | undefined;
    private coreSettingTbl: HTMLDivElement | null | undefined;
    private selectionParam: SelectionParam | undefined;
    private threadMap: Map<string, any> = new Map<string, any>();
    private coreRunningMap: Map<string, any> = new Map<string, any>();
    private runningData: any = [];
    private leftStartNs: number = 0;
    private rightEndNs: number = 0;
    private midCores: number[] = [];
    private largeCores: number[] = [];
    private smallCores: number[] = [];
    private initStatus: boolean = false;

    set data(threadStatesParam: SelectionParam) {
        if (this.selectionParam === threadStatesParam) { return; };
        this.selectionParam = threadStatesParam;
        this.leftStartNs = this.selectionParam!.leftNs + this.selectionParam!.recordStartNs;
        this.rightEndNs = this.selectionParam!.rightNs + this.selectionParam!.recordStartNs;
        //每次新款选线程时清空Map对象
        this.threadMap.clear();
        this.initStatus = false;
        this.initDefaultConfig();
        this.reset()
        this.parallelTable!.recycleDataSource = [];
        this.coreParallelTable!.recycleDataSource = [];
        this.parallelTable!.loading = true;
        this.initParallelData();
    }
    initElements(): void {
        this.parallelTable = this.shadowRoot!.querySelector<LitTable>('#tb-parallel');
        this.coreParallelTable = this.shadowRoot!.querySelector<LitTable>('#tb-core-parallel')
        this.litPopoverEl = this.shadowRoot!.querySelector<LitPopover>('.popover');
        this.shadowRoot!.querySelector<HTMLDivElement>('#core-mining')!.onclick = (e): void => {
            this.coreSettingTbl = this.shadowRoot!.querySelector<HTMLDivElement>('#tb_core_setting');
            if (!(this.initStatus)) {
                this.createCoreTableLine();
            }
        }
        this.shadowRoot!.querySelector<HTMLDivElement>('.confirm-button')!.addEventListener('click', (e: any) => {
            if (this.midCores.length || this.largeCores.length || this.smallCores.length) {
                this.coreRunningMap.clear();
                this.coreParallelTable!.loading = true;
                this.getCoreGroupData().then((res) => {
                    this.coreParallelTable!.recycleDataSource = [...this.coreRunningMap.values()];
                    this.coreParallelTable!.loading = false;
                });     
            }
            this.reset();
        });
        this.shadowRoot!.querySelector<HTMLDivElement>('.reset-button')!.addEventListener('click', (e: any) => {
            this.initDefaultConfig(true);
            this.reset()
            this.createCoreTableLine();
        });
    }
    reset() {
        // @ts-ignore
        this.litPopoverEl!.visible = false;
        if (!this.midCores.length && !this.largeCores.length && !this.smallCores.length) {
            this.parallelTable!.style.display = 'grid'
            this.coreParallelTable!.style.display = 'none';
            this.parallelTable!.recycleDataSource = [...this.threadMap.values()];
        } else {
            this.coreParallelTable!.style.display = 'grid'
            this.parallelTable!.style.display = 'none';
        }
    }
    //获取每次被框选线程对应的state数据
    async initParallelData(): Promise<void> {
        let processIds: Array<number> = [...new Set(this.selectionParam!.processIds)];
        console.time('111111111111')
        let res: any = await queryRunningThread(processIds, this.selectionParam!.threadIds, this.leftStartNs, this.rightEndNs);
        console.timeEnd('111111111111')
        if (res.length === 0) {
            this.parallelTable!.recycleDataSource = [];
            return;
        }
        this.runningData = res;
        console.time('2222222222222222')
        this.handleAllParallelData();
        console.timeEnd('2222222222222222')
    }
    //获取核分类数据
    async getCoreGroupData(): Promise<void> {
        let processIds: Array<number> = [...new Set(this.selectionParam!.processIds)];
        let cpuObj: Object = {
            'largeCores': this.largeCores,
            'midCores': this.midCores,
            'smallCores': this.smallCores
        }
        for (const [key, val] of Object.entries(cpuObj)) {
            if (val.length) {
                let res: any = await queryCoreRunningThread(processIds, this.selectionParam!.threadIds, val, this.leftStartNs, this.rightEndNs);
                this.hanldeCoreGroupData(res, key);
            };
        }
        for (const [i, item] of this.coreRunningMap) {
            item.allParallel = item.allParallel.toFixed(NUM_DIGITS);
            item.duration = (item.duration / UNIT).toFixed(NUM_DIGITS);
        }
    }
    //处理未按核分组的数据
    handleAllParallelData() {
        for (let i = 0; i < this.runningData.length; i++) {
            let stateItem = this.runningData[i];
            if (stateItem.ts < this.leftStartNs) {
                stateItem.ts = this.leftStartNs;
            }
            if (stateItem.endTs > this.rightEndNs) {
                stateItem.endTs = this.rightEndNs;
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
                    title: stateItem.pName ? `${stateItem.pName} ${stateItem.pid}` : `[NULL] ${stateItem.pid}`,
                    tidArr: [stateItem.tid],
                    dur: dur,
                    parallel: null,
                    allParallel: null,
                    allProcessParallel: null,
                    stateItem: [stateItem],
                    tCount: null,
                    duration: null,
                    pDur: null,
                    children: []
                });
            };
        };
        this.showTreeChart(this.threadMap);
    }
    //处理核分组数据
    hanldeCoreGroupData(val: any, key: string) {
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
            if (!this.coreRunningMap.has(`${stateItem.pid}`)) {
                this.coreRunningMap.set(`${stateItem.pid}`, {
                    pid: stateItem.pid,
                    tid: stateItem.tid,
                    title: stateItem.pName ? `${stateItem.pName} ${stateItem.pid}` : `[NULL] ${stateItem.pid}`,
                    dur: dur,
                    parallel: null,
                    allParallel: null,
                    allProcessParallel: null,
                    tCount: null,
                    duration: null,
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
                    parallel: null,
                    allParallel: null,
                    allProcessParallel: null,
                    stateItem: [stateItem],
                    tCount: null,
                    duration: null,
                    pDur: null,
                    children: []
                });
            };
        };
        this.showCoreTreeChart(coreMap)
    }

    hanldRunningParal(value: any) {
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
                pObj.parallel = `${dumpObj.len}线程并行：${((pObj.pDur) / UNIT).toFixed(NUM_DIGITS)}`;
            } else {
                if (dumpObj.len !== 1) {
                    pMap.set(dumpObj.len.toString(), {
                        pid: null,
                        tid: null,
                        title: '',
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
        }
        if (pMap.size === 0) {
            value.allParallel = 0.000.toFixed(NUM_DIGITS);
            value.allProcessParallel = 0.000;
        } else {
            for (const [i, item] of pMap) {
                value.allParallel += item.allParallel;
                value.allProcessParallel += item.allParallel;
                item.allParallel = item.allParallel.toFixed(NUM_DIGITS);
            }
            value.allParallel = value.allParallel.toFixed(NUM_DIGITS);
            value.children = [...pMap.values()];
        }
    }

    showTreeChart(param: any) {
        for (let [key, value] of param) {
            this.hanldRunningParal(value);
        }
        this.parallelTable!.recycleDataSource = [...param.values()];
        this.parallelTable!.loading = false;
    }

    showCoreTreeChart(param: any) {
        for (let [key, value] of param) {
            this.hanldRunningParal(value);
            if (this.coreRunningMap.has(`${value.pid}`)) {
                let obj = this.coreRunningMap.get(`${value.pid}`);
                obj.children.push(value);
                obj.duration += value.dur;
                obj.allParallel += value.allProcessParallel;
            }
        }
    }

    createCoreTableLine() {
        this.initStatus = true;
        let coreData: any = [];
        this.coreSettingTbl!.innerHTML = '';
        this.createCoreHeaderDiv();
        for (let i = 0; i < (window as any).cpuCount; i++) {
            let obj = {
                cpu: i,
                // @ts-ignore
                Large: this.largeCores.includes(i),
                // @ts-ignore
                medium: this.midCores.includes(i),
                // @ts-ignore
                small: this.smallCores.includes(i),
            };
            coreData.push(obj);
            this.createTableLine(obj);
        }
    }

    initDefaultConfig(value?: boolean) {
        if (!this.initStatus || value) {
            this.midCores = [];
            this.largeCores = [];
            this.smallCores = [];
        }
    }

    createCoreHeaderDiv() {
        let cpuIdLine = document.createElement('div');
        cpuIdLine.className = 'core_line';
        cpuIdLine.style.fontWeight = 'bold';
        cpuIdLine.style.fontSize = '12px'
        cpuIdLine.textContent = 'Cpu';
        cpuIdLine.style.textAlign = 'center';
        let LargeLine = document.createElement('div');
        LargeLine.className = 'core_line';
        LargeLine.style.fontWeight = 'bold';
        LargeLine.textContent = 'Large';
        LargeLine.style.fontSize = '12px';
        LargeLine.style.textAlign = 'center';
        let mediumLine = document.createElement('div');
        mediumLine.className = 'core_line';
        mediumLine.style.fontWeight = 'bold';
        mediumLine.textContent = 'Medium';
        mediumLine.style.fontSize = '12px';
        mediumLine.style.textAlign = 'center';
        let smallLine = document.createElement('div');
        smallLine.className = 'core_line';
        smallLine.style.fontWeight = 'bold';
        smallLine.textContent = 'Small';
        smallLine.style.fontSize = '12px';
        smallLine.style.textAlign = 'center';
        this.coreSettingTbl?.append(...[cpuIdLine, LargeLine, mediumLine, smallLine])
    }

    createTableLine(cpuStatus: CpuStatus) {
        let div = document.createElement('div');
        div.textContent = cpuStatus.cpu + '';
        div.style.textAlign = 'center';
        div.style.fontWeight = 'normal';
        let LargeCheckBox: LitCheckBox = new LitCheckBox();
        LargeCheckBox.checked = cpuStatus.Large;
        LargeCheckBox.setAttribute('not-close', '');
        LargeCheckBox.style.marginLeft = 'auto';
        LargeCheckBox.style.marginRight = 'auto';
        let midCheckBox: LitCheckBox = new LitCheckBox();
        midCheckBox.checked = cpuStatus.medium;
        midCheckBox.setAttribute('not-close', '');
        midCheckBox.style.textAlign = 'center';
        midCheckBox.style.marginLeft = 'auto';
        midCheckBox.style.marginRight = 'auto';
        let smallCheckBox: LitCheckBox = new LitCheckBox();
        smallCheckBox.checked = cpuStatus.small;
        smallCheckBox.setAttribute('not-close', '');
        smallCheckBox.style.textAlign = 'center';
        smallCheckBox.style.marginLeft = 'auto';
        smallCheckBox.style.marginRight = 'auto';
        LargeCheckBox.addEventListener('change', (e) => {
            midCheckBox.checked = false;
            smallCheckBox.checked = false;
            cpuStatus.Large = true;
            this.largeCores.push(cpuStatus.cpu);
            this.midCores = this.midCores.filter((it) => it !== cpuStatus.cpu);
            this.smallCores = this.smallCores.filter((it) => it !== cpuStatus.cpu);
        });
        midCheckBox.addEventListener('change', (e: any) => {
            LargeCheckBox.checked = false;
            smallCheckBox.checked = false;
            cpuStatus.medium = true;
            this.midCores.push(cpuStatus.cpu);
            this.largeCores = this.largeCores.filter((it) => it !== cpuStatus.cpu);
            this.smallCores = this.smallCores.filter((it) => it !== cpuStatus.cpu);
        });
        smallCheckBox.addEventListener('change', (e: any) => {
            midCheckBox.checked = false;
            LargeCheckBox.checked = false;
            cpuStatus.small = true;
            this.smallCores.push(cpuStatus.cpu);
            this.midCores = this.midCores.filter((it) => it !== cpuStatus.cpu);
            this.largeCores = this.largeCores.filter((it) => it !== cpuStatus.cpu);
        });
        this.coreSettingTbl!.append(...[div, LargeCheckBox, midCheckBox, smallCheckBox]);
    }

    
    //回调函数，首次插入DOM时执行的初始化回调
    connectedCallback(): void {
        new ResizeObserver(() => {
            if (this.parentElement?.clientHeight !== 0) {
                // @ts-ignore
                this.parallelTable!.shadowRoot!.querySelector('.table')!.style.height = this.parentElement!.clientHeight - 50 + 'px';
                this.parallelTable?.reMeauseHeight();
                // @ts-ignore
                this.coreParallelTable!.shadowRoot!.querySelector('.table')!.style.height = this.parentElement!.clientHeight - 50 + 'px';
                this.coreParallelTable?.reMeauseHeight();
            }
        }).observe(this.parentElement!);
    }
    initHtml(): string {
        return ClassifyCoreSettingHtml;
    }
}
