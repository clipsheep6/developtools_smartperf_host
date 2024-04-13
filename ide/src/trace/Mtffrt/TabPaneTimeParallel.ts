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
    private bottomFilterEl: HTMLDivElement | null | undefined;
    private parallelTable: LitTable | null | undefined;
    private coreParallelTable: LitTable | null | undefined;
    private litPopoverEl: LitPopover | null | undefined;
    private coreSettingTbl: HTMLDivElement | null | undefined;
    private selectionParam: SelectionParam | undefined;
    private allCoreMap: Map<string, any> = new Map<string, any>();
    private coreRunningMap: Map<string, any> = new Map<string, any>();
    private runningData: any = [];
    private leftStartNs: number = 0;
    private rightEndNs: number = 0;
    private midCores: Array<number> = [];
    private largeCores: Array<number> = [];
    private smallCores: Array<number> = [];
    private initStatus: boolean = false;

    set data(threadStatesParam: SelectionParam) {
        if (this.selectionParam === threadStatesParam) { return; };
        this.selectionParam = threadStatesParam;
        this.leftStartNs = this.selectionParam!.leftNs + this.selectionParam!.recordStartNs;
        this.rightEndNs = this.selectionParam!.rightNs + this.selectionParam!.recordStartNs;
        //每次新款选线程时清空Map对象
        this.allCoreMap.clear();
        this.initStatus = false;
        this.initDefaultConfig();
        this.parallelTable!.recycleDataSource = [];
        this.coreParallelTable!.recycleDataSource = [];
        this.switchTableInfo();
    }
    initElements(): void {
        this.parallelTable = this.shadowRoot!.querySelector<LitTable>('#tb-parallel');
        this.coreParallelTable = this.shadowRoot!.querySelector<LitTable>('#tb-core-parallel')
        this.litPopoverEl = this.shadowRoot!.querySelector<LitPopover>('.popover');
        this.bottomFilterEl = this.shadowRoot!.querySelector<HTMLDivElement>('.bottom_filter');
        this.shadowRoot!.querySelector<HTMLDivElement>('#core-mining')!.onclick = (e): void => {
            this.coreSettingTbl = this.shadowRoot!.querySelector<HTMLDivElement>('#tb_core_setting');
            if (!this.initStatus) { this.createCoreTableLine() }
        }
        this.shadowRoot!.querySelector<HTMLDivElement>('.confirm-button')!.addEventListener('click', (e: any) => {
            this.switchTableInfo();
        });
        this.shadowRoot!.querySelector<HTMLDivElement>('.reset-button')!.addEventListener('click', (e: any) => {
            this.initStatus = false;
            this.createCoreTableLine();
            this.switchTableInfo();
        });
    }
    switchTableInfo(): void {
        // @ts-ignore
        this.litPopoverEl!.visible = false;
        //当大中小核未分组时，默认查询所有核
        if (!this.midCores.length && !this.largeCores.length && !this.smallCores.length) {
            this.parallelTable!.style.display = 'grid'
            this.coreParallelTable!.style.display = 'none';
            this.parallelTable!.loading = true;
            if (this.allCoreMap.size === 0) { this.getAllCoreData() }
            this.parallelTable!.recycleDataSource = [...this.allCoreMap.values()];
            this.parallelTable!.loading = false;
        } else {
            this.coreParallelTable!.style.display = 'grid'
            this.parallelTable!.style.display = 'none';
            this.coreRunningMap.clear();
            this.coreParallelTable!.loading = true;
            this.getCoreGroupData().then((res) => {
                this.coreParallelTable!.recycleDataSource = [...res.values()];
                this.coreParallelTable!.loading = false;
            });
        }
    }

    reset() {
        this.parallelTable!.style.display = 'grid'
        this.coreParallelTable!.style.display = 'none';
        this.parallelTable!.loading = true;
        if (this.allCoreMap.size === 0) {
            if ((window as any).cpuCount === 12) {
                this.assignGroupCore()
            } else {
                this.getAllCoreData()
            }
            this.coreParallelTable!.recycleDataSource = [...this.allCoreMap.values()];
            this.coreParallelTable!.loading = false;
        }
        this.parallelTable!.recycleDataSource = [...this.allCoreMap.values()];
        this.parallelTable!.loading = false;
    }

    assignGroupCore() {
        this.coreParallelTable!.style.display = 'grid'
        this.parallelTable!.style.display = 'none';
        this.coreParallelTable!.loading = true;
        this.getCoreGroupData().then((res) => {
            this.allCoreMap = res;
            // this.coreParallelTable!.recycleDataSource = [...res.values()];
            // this.coreParallelTable!.loading = false;
        });
    }
    assignAllCore() {
        this.parallelTable!.style.display = 'grid'
        this.coreParallelTable!.style.display = 'none';
        this.parallelTable!.loading = true;
        this.getAllCoreData().then((res) => {
            this.allCoreMap = res;
            // this.coreParallelTable!.recycleDataSource = [...res.values()];
            // this.coreParallelTable!.loading = false;
        });
        // this.parallelTable!.recycleDataSource = [...this.allCoreMap.values()];
        // this.parallelTable!.loading = false;
    }

    initDefaultConfig(): void {
        if (!this.initStatus) {
            if ((window as any).cpuCount === 12) {
                this.smallCores = SMALL_CPU_NUM;
                this.midCores = MID_CPU_NUM12;
                this.largeCores = LARGE_CPU_NUM12;
            } else {
                this.smallCores = [];
                this.midCores = [];
                this.largeCores = [];
            }
        }
    }

    //获取每次被框选线程对应的state数据
    async getAllCoreData(): Promise<any> {
        let dataSourceMap: Map<string, any> = new Map<string, any>();
        let processIds: Array<number> = [...new Set(this.selectionParam!.processIds)];
        let res: any = await queryRunningThread(processIds, this.selectionParam!.threadIds, this.leftStartNs, this.rightEndNs);
        if (res.length === 0) {
            this.parallelTable!.recycleDataSource = [];
            return;
        }
        this.runningData = res;
        this.handleAllParallelData(dataSourceMap);
        return dataSourceMap
    }
    //获取核分类数据
    async getCoreGroupData(): Promise<any> {
        let dataSourceMap: Map<string, any> = new Map<string, any>();
        let processIds: Array<number> = [...new Set(this.selectionParam!.processIds)];
        let cpuObj: Object = {
            'L': this.largeCores,
            'M': this.midCores,
            'S': this.smallCores
        }
        for (const [key, val] of Object.entries(cpuObj)) {
            if (val.length) {
                let res: any = await queryCoreRunningThread(processIds, this.selectionParam!.threadIds, val, this.leftStartNs, this.rightEndNs);
                if (res.length === 0) {
                    this.coreParallelTable!.recycleDataSource = [];
                    return;
                }
                this.hanldeGroupParalleData(res, key, dataSourceMap);
            };
        }
        //转换最外层数据单位即保留三位小数
        for (const [i, item] of dataSourceMap) {
            item.allParallel = item.allParallel.toFixed(NUM_DIGITS);
            item.dur = (item.dur / UNIT).toFixed(NUM_DIGITS);
        }
        return dataSourceMap
    }
    //处理未按核分组的数据
    handleAllParallelData(dataSourceMap: Map<string, any>): void {
        for (let i = 0; i < this.runningData.length; i++) {
            let stateItem = this.runningData[i];
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

    hanldRunningParal(value: any, pMap: Map<string, any>): void {
        let arr = value.stateItem;
        let waitArr: any = [];
        let dumpArr: any = [];
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
                        dumpArr.push({ dumpObj });
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
                    dumpArr.push({ dumpObj });
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

    showTreeChart(param: Map<string, any>): void {
        for (let [key, value] of param) {
            let pMap: Map<string, any> = new Map<string, any>();
            this.hanldRunningParal(value, pMap);
            value.tCount = value.tidArr.length;
            value.dur = (value.dur / UNIT).toFixed(NUM_DIGITS);
            if (pMap.size === 0) {
                value.allParallel = 0.000.toFixed(NUM_DIGITS);
            } else {
                for (const [i, item] of pMap) {
                    value.allParallel += item.allParallel;
                    item.allParallel = item.allParallel.toFixed(NUM_DIGITS);
                }
                value.allParallel = value.allParallel.toFixed(NUM_DIGITS);
                value.children = [...pMap.values()];
            }
        }
        this.parallelTable!.recycleDataSource = [...param.values()];
        this.parallelTable!.loading = false;
    }

    showCoreTreeChart(param: any, dataSourceMap: Map<string, any>): void {
        for (let [key, value] of param) {
            let pMap: Map<string, any> = new Map<string, any>();
            this.hanldRunningParal(value, pMap);
            if (pMap.size === 0) {
                value.allParallel = 0.000;
                value.parallelNum = '-';
                value.parallelDur = '-';
            } else {
                for (const [i, item] of pMap) {
                    value.allParallel += item.allParallel;
                    item.allParallel = item.allParallel;
                    item.allParallel = item.allParallel.toFixed(NUM_DIGITS);
                }
                value.children = [...pMap.values()];
            }
            if (dataSourceMap.has(`${value.pid}`)) {
                let obj = dataSourceMap.get(`${value.pid}`);
                value.tCount = value.tidArr.length;
                obj.dur += value.dur;
                obj.allParallel += value.allParallel;
                value.allParallel = value.allParallel.toFixed(NUM_DIGITS);
                value.dur = (value.dur / UNIT).toFixed(NUM_DIGITS);
                obj.children.push(value);
            }
        }
    }

    createCoreTableLine(): void {
        this.initDefaultConfig();
        this.initStatus = true;
        this.coreSettingTbl!.innerHTML = '';
        this.createCoreHeaderDiv();
        for (let i = 0; i < (window as any).cpuCount; i++) {
            let obj = {
                cpu: i,
                // @ts-ignore
                small: this.smallCores.includes(i),
                // @ts-ignore
                medium: this.midCores.includes(i),
                // @ts-ignore
                large: this.largeCores.includes(i),
            };
            this.createCheckBoxLine(obj);
        }
    }

    //给分类框添加checkBox等元素构成一个列表
    createCoreHeaderDiv(): void {
        let cpuIdLine = document.createElement('div');
        cpuIdLine.className = 'core_line';
        cpuIdLine.style.fontWeight = 'bold';
        cpuIdLine.style.fontSize = '12px'
        cpuIdLine.textContent = 'Cpu';
        cpuIdLine.style.textAlign = 'center';
        let smallLine = document.createElement('div');
        smallLine.className = 'core_line';
        smallLine.style.fontWeight = 'bold';
        smallLine.textContent = 'S';
        smallLine.style.fontSize = '12px';
        smallLine.style.textAlign = 'center';
        let mediumLine = document.createElement('div');
        mediumLine.className = 'core_line';
        mediumLine.style.fontWeight = 'bold';
        mediumLine.textContent = 'M';
        mediumLine.style.fontSize = '12px';
        mediumLine.style.textAlign = 'center';
        let largeLine = document.createElement('div');
        largeLine.className = 'core_line';
        largeLine.style.fontWeight = 'bold';
        largeLine.textContent = 'L';
        largeLine.style.fontSize = '12px';
        largeLine.style.textAlign = 'center';
        this.coreSettingTbl?.append(...[cpuIdLine, smallLine, mediumLine, largeLine]);
    }

    createCheckBoxLine(cpuStatus: CpuStatus): void {
        let div = document.createElement('div');
        div.textContent = cpuStatus.cpu + '';
        div.style.textAlign = 'center';
        div.style.fontWeight = 'normal';
        let smallCheckBox: LitCheckBox = new LitCheckBox();
        smallCheckBox.checked = cpuStatus.small;
        smallCheckBox.setAttribute('not-close', '');
        smallCheckBox.style.textAlign = 'center';
        smallCheckBox.style.marginLeft = 'auto';
        smallCheckBox.style.marginRight = 'auto';
        let midCheckBox: LitCheckBox = new LitCheckBox();
        midCheckBox.checked = cpuStatus.medium;
        midCheckBox.setAttribute('not-close', '');
        // midCheckBox.style.textAlign = 'center';
        midCheckBox.style.marginLeft = 'auto';
        midCheckBox.style.marginRight = 'auto';
        let largeCheckBox: LitCheckBox = new LitCheckBox();
        largeCheckBox.checked = cpuStatus.large;
        largeCheckBox.setAttribute('not-close', '');
        largeCheckBox.style.marginLeft = 'auto';
        largeCheckBox.style.marginRight = 'auto';
        smallCheckBox.addEventListener('change', (e: any) => {
            midCheckBox.checked = false;
            largeCheckBox.checked = false;
            cpuStatus.small = e.detail.checked;
            this.canUpdateCheckList(e.detail.checked, this.smallCores, cpuStatus.cpu);
            this.midCores = this.midCores.filter((it) => it !== cpuStatus.cpu);
            this.largeCores = this.largeCores.filter((it) => it !== cpuStatus.cpu);
        });
        midCheckBox.addEventListener('change', (e: any) => {
            largeCheckBox.checked = false;
            smallCheckBox.checked = false;
            cpuStatus.medium = e.detail.checked;
            this.canUpdateCheckList(e.detail.checked, this.midCores, cpuStatus.cpu);
            this.largeCores = this.largeCores.filter((it) => it !== cpuStatus.cpu);
            this.smallCores = this.smallCores.filter((it) => it !== cpuStatus.cpu);
        });
        largeCheckBox.addEventListener('change', (e: any) => {
            midCheckBox.checked = false;
            smallCheckBox.checked = false;
            cpuStatus.large = e.detail.checked;
            this.canUpdateCheckList(e.detail.checked, this.largeCores, cpuStatus.cpu);
            this.midCores = this.midCores.filter((it) => it !== cpuStatus.cpu);
            this.smallCores = this.smallCores.filter((it) => it !== cpuStatus.cpu);
        });
        this.coreSettingTbl!.append(...[div, smallCheckBox, midCheckBox, largeCheckBox,]);
    }

    //判断checkList数组是否需要push数据或删除数据
    canUpdateCheckList(check: boolean, coreArr: Array<number>, cpu: number): void {
        if (check) {
            const isFalse = coreArr.includes(cpu);
            if (!isFalse) {
                coreArr.push(cpu)
            }
        } else {
            const index = coreArr.indexOf(cpu);
            if (index !== -1) {
                coreArr.splice(index, 1);
            }
        }
    }

    //回调函数，首次插入DOM时执行的初始化回调
    connectedCallback(): void {
        super.connectedCallback();
        new ResizeObserver(() => {
            if (this.parentElement?.clientHeight !== 0) {
                // @ts-ignore
                this.parallelTable!.shadowRoot!.querySelector('.table')!.style.height = this.parentElement!.clientHeight - 50 + 'px';
                this.parallelTable?.reMeauseHeight();
                // @ts-ignore
                this.coreParallelTable!.shadowRoot!.querySelector('.table')!.style.height = this.parentElement!.clientHeight - 50 + 'px';
                this.coreParallelTable?.reMeauseHeight();
                if (this.parentElement!.clientHeight >= 0 && this.parentElement!.clientHeight <= 31) {
                    this.bottomFilterEl!.style.display = 'none';
                } else {
                    this.bottomFilterEl!.style.display = 'flex';
                }
            }
        }).observe(this.parentElement!);
    }
    initHtml(): string {
        return ClassifyCoreSettingHtml;
    }
}
