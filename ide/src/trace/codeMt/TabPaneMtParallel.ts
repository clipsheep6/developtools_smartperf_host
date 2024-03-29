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
import { LitRadioBox } from '../../../../../base-ui/radiobox/LitRadioBox';
import '../../../../../base-ui/radiobox/LitRadioBox';
import { LitTable } from '../../../../../base-ui/table/lit-table';
import '../../../../../base-ui/popover/LitPopoverV';
import { LitPopover } from '../../../../../base-ui/popover/LitPopoverV';
import { SelectionData, SelectionParam } from '../../../../bean/BoxSelection';
import { queryRunningThread, queryCoreRunningThread } from '../../../../database/sql/ProcessThread.sql';
import { MtSettingHtml } from '../../sheet/TabPaneMt.html';
import { LitCheckBox } from '../../../../../base-ui/checkbox/LitCheckBox';
import '../../../../../base-ui/checkbox/LitCheckBox';
import { json } from 'stream/consumers';

const UNIT: number = 1000000.0;
const NUM_DIGITS: number = 3;
const CORE_JSON: any = {
    'group1': [4, 5],
    'group2': [6, 7],
    'group3': [8, 9],
    'group4': [10, 11]
}
const SMALL_CPU_NUM6: Array<number> = [0, 1, 2];
const MID_CPU_NUM6: Array<number> = [3, 4];
const LARGE_CPU_NUM6: Array<number> = [5];
const SMALL_CPU_NUM: Array<number> = [0, 1, 2, 3];
const MID_CPU_NUM8: Array<number> = [4, 5, 6];
const LARGE_CPU_NUM8: Array<number> = [7];
const MID_CPU_NUM12: Array<number> = [4, 5, 6, 7, 8, 9];
const LARGE_CPU_NUM12: Array<number> = [10, 11];

export class CpuStatus {
    cpu: number = 0;
    small: boolean = false;
    medium: boolean = false;
    large: boolean = false;
}
@element('tabpane-mt-parallel')
export class TabPaneMtParallel extends BaseElement {
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
    private midCores: Array<number> = [];
    private largeCores: Array<number> = [];
    private smallCores: Array<number> = [];
    private initStatus: boolean = false;
    private coreGroupMap: Map<string, any> = new Map<string, any>();

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
        // this.parallelTable!.loading = true;
        this.getMtParallelData();
    }
    initElements(): void {
        this.parallelTable = this.shadowRoot!.querySelector<LitTable>('#tb-parallel');
        this.coreParallelTable = this.shadowRoot!.querySelector<LitTable>('#tb-core-parallel')
        this.litPopoverEl = this.shadowRoot!.querySelector<LitPopover>('.popover');
        this.shadowRoot!.querySelector<HTMLDivElement>('#core-mining')!.onclick = (e): void => {
            this.coreSettingTbl = this.shadowRoot!.querySelector<HTMLDivElement>('#tb_core_setting');
            if (!this.initStatus) {
                this.createCoreTableLine();
            }
        }
        this.shadowRoot!.querySelector<HTMLDivElement>('.confirm-button')!.addEventListener('click', (e: any) => {
            if (this.midCores.length || this.largeCores.length || this.smallCores.length) {
                // this.coreRunningMap.clear();
                // this.coreParallelTable!.loading = true;
                // this.getCoreGroupData().then((res) => {
                //     this.coreParallelTable!.recycleDataSource = [...this.coreRunningMap.values()];
                //     this.coreParallelTable!.loading = false;
                // });
            }
            this.reset();
        });
    }
    reset(): void {
        // @ts-ignore
        this.litPopoverEl!.visible = false;
        // if (!this.midCores.length && !this.largeCores.length && !this.smallCores.length) {
        //     this.parallelTable!.style.display = 'grid'
        this.coreParallelTable!.style.display = 'none';
        //     this.parallelTable!.recycleDataSource = [...this.threadMap.values()];
        // } else {
        //     this.coreParallelTable!.style.display = 'grid'
        //     this.parallelTable!.style.display = 'none';
        // }
    }

    async getMtParallelData() {
        let processIds: Array<number> = [...new Set(this.selectionParam!.processIds)];
        let cpuObj: Object = {
            'largeCores': this.largeCores,
            'midCores': this.midCores,
            'smallCores': this.smallCores
        }
        for (const [key, val] of Object.entries(cpuObj)) {
            let arrCore = this.handleSamePhysicsCore(val);
            if (arrCore.length) {
                let res: any = await queryCoreRunningThread(processIds, this.selectionParam!.threadIds, val, this.leftStartNs, this.rightEndNs);
                this.handleMtGroupData(res, key);
            };
        }
        // for (const [i, item] of this.coreRunningMap) {
        //     item.allParallel = item.allParallel.toFixed(NUM_DIGITS);
        //     item.dur = (item.dur / UNIT).toFixed(NUM_DIGITS);
        // }
    }
    handleSamePhysicsCore(arr: any) {
        let value = Object.values(CORE_JSON);
        let mtArr: any = [];
        value.forEach((item: any) => {
            let isSet = arr.includes(item[0]) && arr.includes(item[1])
            if (isSet) {
                mtArr = item
            }
        })
        return mtArr
    }
    handleMtGroupData(val: any, key: string) {
        let mtMap: Map<string, any> = new Map<string, any>();
        for (let i = 0; i < val.length; i++) {
            let stateItem = val[i];
            if (stateItem.ts < this.leftStartNs) {
                stateItem.ts = this.leftStartNs;
            }
            if (stateItem.endTs > this.rightEndNs) {
                stateItem.endTs = this.rightEndNs;
            }
            let dur = stateItem.endTs - stateItem.ts;
            // if (!this.coreRunningMap.has(`${stateItem.pid}`)) {
            //     this.coreRunningMap.set(`${stateItem.pid}`, {
            //         pid: stateItem.pid,
            //         tid: stateItem.tid,
            //         title: stateItem.pName ? `${stateItem.pName} ${stateItem.pid}` : `[NULL] ${stateItem.pid}`,
            //         dur: null,
            //         parallelNum: null,
            //         parallelDur: null,
            //         allParallel: null,
            //         tCount: null,
            //         pDur: null,
            //         children: []
            //     });
            // };
            if (mtMap.has(`${stateItem.pid} ${key}`)) {
                let obj = mtMap.get(`${stateItem.pid} ${key}`);
                let setArr = new Set(obj.tidArr);
                if (!(setArr.has(stateItem.tid))) {
                    setArr.add(stateItem.tid);
                    obj.tidArr.push(stateItem.tid);
                }
                obj.dur += dur;
                obj!.stateItem.push(stateItem)
            } else {
                mtMap.set(`${stateItem.pid} ${key}`, {
                    pid: stateItem.pid,
                    tid: stateItem.tid,
                    title: stateItem.pName ? `${stateItem.pName} ${stateItem.pid}` : `[NULL] ${stateItem.pid}`,
                    tidArr: [stateItem.tid],
                    dur: null,
                    parallelNum: null,
                    parallelDur: null,
                    allParallel: null,
                    tCount: null,
                    pDur: null,
                    children: [
                        {
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
                        }
                    ]
                });
            };
        };
    }
    initDefaultConfig(): void {
        if (!this.initStatus) {
            if ((window as any).cpuCount === 12) {
                this.smallCores = SMALL_CPU_NUM;
                this.midCores = MID_CPU_NUM12;
                this.largeCores = LARGE_CPU_NUM12;
            } else if ((window as any).cpuCount === 8) {
                this.smallCores = SMALL_CPU_NUM;
                this.midCores = MID_CPU_NUM8;
                this.largeCores = LARGE_CPU_NUM8;
            } else if ((window as any).cpuCount === 6) {
                this.smallCores = SMALL_CPU_NUM6;
                this.midCores = MID_CPU_NUM6;
                this.largeCores = LARGE_CPU_NUM6;
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
        smallLine.textContent = 'Small';
        smallLine.style.fontSize = '12px';
        smallLine.style.textAlign = 'center';
        let mediumLine = document.createElement('div');
        mediumLine.className = 'core_line';
        mediumLine.style.fontWeight = 'bold';
        mediumLine.textContent = 'Medium';
        mediumLine.style.fontSize = '12px';
        mediumLine.style.textAlign = 'center';
        let largeLine = document.createElement('div');
        largeLine.className = 'core_line';
        largeLine.style.fontWeight = 'bold';
        largeLine.textContent = 'Large';
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
        return MtSettingHtml;
    }
}
