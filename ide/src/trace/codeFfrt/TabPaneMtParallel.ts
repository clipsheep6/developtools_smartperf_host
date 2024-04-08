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
const CORE_JSON = {
    'group1': [4, 5],
    'group2': [6, 7],
    'group3': [8, 9],
    'group4': [10, 11],
};
const CORE_NUM: number = 12;
const SMALL_CPU_NUM: Array<number> = [0, 1, 2, 3];
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
    private litPopoverEl: LitPopover | null | undefined;
    private gourpPopoverEl: LitPopover | null | undefined;
    private cpuTbl: HTMLDivElement | null | undefined;
    private addGroupTbl: HTMLDivElement | null | undefined;
    private contentDiv: HTMLDivElement | null | undefined;
    private coreSettingTbl: HTMLDivElement | null | undefined;
    private selectionParam: SelectionParam | undefined;
    private threadMap: Map<string, any> = new Map<string, any>();
    private mtMap: Map<string, any> = new Map<string, any>();
    private leftStartNs: number = 0;
    private rightEndNs: number = 0;
    private midCores: Array<number> = [];
    private largeCores: Array<number> = [];
    private smallCores: Array<number> = [];
    private initStatus: boolean = false;
    private coreGroupMap: Map<string, any> = new Map<string, any>();
    private bottomFilterEl: HTMLDivElement | null | undefined;
    private initGroupStatus: boolean = false;
    private addGroupArr: Array<number> = [];
    private mapGroup: Map<string, Array<any>> = new Map<string, any>();
    private checkArr: Array<number> = [];
    private time: number = 0;

    set data(threadStatesParam: SelectionParam) {
        if (this.selectionParam === threadStatesParam) { return; };
        this.selectionParam = threadStatesParam;
        this.leftStartNs = this.selectionParam!.leftNs + this.selectionParam!.recordStartNs;
        this.rightEndNs = this.selectionParam!.rightNs + this.selectionParam!.recordStartNs;
        this.time = this.rightEndNs - this.leftStartNs;
        //每次新款选线程时清空Map对象
        this.threadMap.clear();
        // this.coreGroupMap.clear();
        // this.mtMap.clear();
        this.initStatus = false;
        this.initGroupStatus = false;
        this.initDefaultConfig();
        this.reset();
        this.groupReset();
        this.parallelTable!.recycleDataSource = [];
        if (this.midCores.length || this.largeCores.length || this.smallCores.length) {
            const myMap = new Map(Object.entries(CORE_JSON));
            if (myMap.size !== 0) {
                this.coreGroupMap.clear();
                this.mtMap.clear();
                this.parallelTable!.loading = true;
                this.getMtParallelData(myMap).then(() => {
                    this.parallelTable!.recycleDataSource = [...this.mtMap.values()];
                    this.parallelTable!.loading = false;
                });
            }
        } else {
            this.parallelTable!.recycleDataSource = [];
        }
    }
    initElements(): void {
        this.parallelTable = this.shadowRoot!.querySelector<LitTable>('#tb-parallel');
        this.litPopoverEl = this.shadowRoot!.querySelector<LitPopover>('#data-mining-popover');
        this.coreSettingTbl = this.shadowRoot!.querySelector<HTMLDivElement>('#tb_core_setting');
        this.bottomFilterEl = this.shadowRoot!.querySelector<HTMLDivElement>('.bottom_filter');
        this.gourpPopoverEl = this.shadowRoot!.querySelector<LitPopover>('#group-mining-popover');
        this.cpuTbl = this.shadowRoot!.querySelector<HTMLDivElement>('#tb_cpu');
        this.addGroupTbl = this.shadowRoot!.querySelector<HTMLDivElement>('#tb_add_group');
        this.contentDiv = this.addGroupTbl!.querySelector<HTMLDivElement>('.add_content');
        this.shadowRoot!.querySelector<HTMLDivElement>('#core-mining')!.onclick = (e): void => {
            if (!this.initStatus) {
                this.createCoreTableLine();
            }
        }
        this.shadowRoot!.querySelector<HTMLDivElement>('.confirm-button')!.addEventListener('click', (e: any) => {
            if ((this.midCores.length || this.largeCores.length || this.smallCores.length) && this.mapGroup.size !== 0) {
                this.coreGroupMap.clear();
                this.mtMap.clear();
                this.parallelTable!.loading = true;
                this.getMtParallelData(this.mapGroup).then(() => {
                    this.parallelTable!.recycleDataSource = [...this.mtMap.values()];
                    this.parallelTable!.loading = false;
                });
            } else {
                this.parallelTable!.recycleDataSource = [];
            }
            this.reset();
        });
        this.shadowRoot!.querySelector<HTMLDivElement>('.reset-button')!.addEventListener('click', (e: any) => {
            this.initStatus = false;
            this.initDefaultConfig();
            if (this.midCores.length || this.largeCores.length || this.smallCores.length) {
                const myMap = new Map(Object.entries(CORE_JSON));
                if (myMap.size !== 0) {
                    this.coreGroupMap.clear();
                    this.mtMap.clear();
                    this.parallelTable!.loading = true;
                    this.getMtParallelData(myMap).then(() => {
                        this.parallelTable!.recycleDataSource = [...this.mtMap.values()];
                        this.parallelTable!.loading = false;
                    });
                }
            } else {
                this.parallelTable!.recycleDataSource = [];
            }
            this.reset();
        });
        this.shadowRoot!.querySelector<HTMLDivElement>('#group-mining')!.addEventListener('click', (e: any) => {
            if (!this.initGroupStatus) {
                this.getGroupTableLine();
                if ((window as any).cpuCount == CORE_NUM) {
                    const myMap = new Map(Object.entries(CORE_JSON));
                    for (const val of myMap.values()) {
                        this.initGroupFn(val);
                    }
                }
            }
        });
        this.shadowRoot!.querySelector<HTMLDivElement>('.add_group_button')!.addEventListener('click', (e: any) => {
            this.initGroupFn(this.addGroupArr);
            this.addGroupArr = [];
        })
        this.shadowRoot!.querySelector<HTMLDivElement>('.cut_group_button')!.addEventListener('click', (e: any) => {
            if (!this.contentDiv!.childNodes.length) { return };
            let parts: any = this.contentDiv!.lastChild!.textContent?.split(':');
            if (this.mapGroup.has(parts[0])) { this.mapGroup.delete(parts[0]) };
            this.checkArr = [...this.mapGroup.values()].reduce((acc, val) => acc.concat(val), []);
            this.contentDiv!.removeChild(this.contentDiv!.lastChild!);
            this.getGroupTableLine('cut');
        })
        this.shadowRoot!.querySelector<HTMLDivElement>('.reset-group-button')!.addEventListener('click', (e: any) => {
            this.groupReset();
            if ((this.midCores.length || this.largeCores.length || this.smallCores.length) && (window as any).cpuCount === CORE_NUM) {
                const myMap = new Map(Object.entries(CORE_JSON));
                if (myMap.size !== 0) {
                    this.coreGroupMap.clear();
                    this.mtMap.clear();
                    this.parallelTable!.loading = true;
                    this.getMtParallelData(myMap).then(() => {
                        this.parallelTable!.recycleDataSource = [...this.mtMap.values()];
                        this.parallelTable!.loading = false;
                    });
                }
            } else {
                this.parallelTable!.recycleDataSource = [];
            }

        });
        this.shadowRoot!.querySelector<HTMLDivElement>('.confirm-group-button')!.addEventListener('click', (e: any) => {
            if ((this.midCores.length || this.largeCores.length || this.smallCores.length) && this.mapGroup.size !== 0) {
                this.coreGroupMap.clear();
                this.mtMap.clear();
                this.parallelTable!.loading = true;
                this.getMtParallelData(this.mapGroup).then(() => {
                    this.parallelTable!.recycleDataSource = [...this.mtMap.values()];
                    this.parallelTable!.loading = false;
                });
            } else {
                this.parallelTable!.recycleDataSource = [];
            }
            // @ts-ignore
            this.gourpPopoverEl!.visible = false;
        })
    }
    reset(): void {
        // @ts-ignore
        this.litPopoverEl!.visible = false;
    }
    groupReset(): void {
        // @ts-ignore
        this.gourpPopoverEl!.visible = false;
        this.initGroupStatus = false;
        this.checkArr = [];
        this.addGroupArr = [];
        this.mapGroup.clear();
        this.addGroupTbl!.querySelector<HTMLDivElement>('.add_content')!.innerHTML = '';
    }

    async getMtParallelData(obj: Map<string, any>) {
        let cpuObj: any = {
            'L': this.largeCores,
            'M': this.midCores,
            'S': this.smallCores
        }
        let processIds: Array<number> = [...new Set(this.selectionParam!.processIds)];
        for (const [key, val] of obj.entries()) {
            let core = this.handleSamePhysicsCore(val, cpuObj);
            if (core) {
                let res: any = await queryCoreRunningThread(processIds, this.selectionParam!.threadIds, val, this.leftStartNs, this.rightEndNs);
                this.handleTreeProcessData(res, core, key, val);
            };
        }
        for (const [i, item] of this.coreGroupMap) {
            if (this.mtMap.has(`${item.pid}`)) {
                let obj = this.mtMap.get(`${item.pid}`);
                obj.dur += item.dur;
                obj.parallelDur += item.parallelDur;
                obj.allParallel += item.allParallel;
                obj.load += item.load;
                item.dur = (item.dur / UNIT).toFixed(NUM_DIGITS);
                item.parallelDur = (item.parallelDur / UNIT).toFixed(NUM_DIGITS);
                item.allParallel = item.allParallel.toFixed(NUM_DIGITS);
                item.load = item.load.toFixed(NUM_DIGITS);
                obj.children.push(item);
            }
        }
        for (const [i, item] of this.mtMap) {
            item.dur = (item.dur / UNIT).toFixed(NUM_DIGITS);
            item.parallelDur = (item.parallelDur / UNIT).toFixed(NUM_DIGITS);
            item.allParallel = item.allParallel.toFixed(NUM_DIGITS);
            item.load = item.load.toFixed(NUM_DIGITS);
        }
    }
    //判断自配的核是否符合计算MT并行度的要求

    mergeTreeCoreData(map: Map<string, any>, coreKey: string, gourpKey: string, gourp: Array<number>) {
        let str = gourp.join(',');
        for (const [key, value] of map) {
            let pDur = this.hanldParalLogic(value);
            let paral = (pDur * gourp.length / value.gourpDur) * 100;
            let load = value.gourpDur / (this.time * (window as any).cpuCount);
            let groupObj = {
                pid: value.pid,
                tid: value.tid,
                title: '',
                group: `${gourpKey}:${str}`,
                dur: (value.gourpDur / UNIT).toFixed(NUM_DIGITS),
                parallelNum: gourp.length,
                parallelDur: (pDur / UNIT).toFixed(NUM_DIGITS),
                allParallel: paral.toFixed(NUM_DIGITS),
                load: load.toFixed(NUM_DIGITS),
                tCount: value.tidArr.length,
                children: []
            }
            if (this.coreGroupMap.has(`${value.pid} ${coreKey}`)) {
                let obj = this.coreGroupMap.get(`${value.pid} ${coreKey}`);
                obj.dur += value.gourpDur;
                obj.parallelDur += pDur;
                obj.allParallel += paral;
                obj.load += load;
                obj.children.push(groupObj);
            } else {
                this.coreGroupMap.set(`${value.pid} ${coreKey}`, {
                    pid: value.pid,
                    tid: value.tid,
                    title: `${coreKey}`,
                    group: '',
                    dur: value.gourpDur,
                    parallelNum: null,
                    parallelDur: pDur,
                    allParallel: paral,
                    load: load,
                    tCount: null,
                    children: [groupObj]
                });
            }
        }
    }


    //判断checkList数组是否需要push数据或删除数据
    canUpdateCheckList(check: boolean, arr: Array<number>, cpu: number): void {
        if (check) {
            const isFalse = arr.includes(cpu);
            if (!isFalse) {
                arr.push(cpu);
            }
        } else {
            const index = arr.indexOf(cpu);
            if (index !== -1) {
                arr.splice(index, 1);
            }
        }
    }

    //初始化分组
    initGroupFn(arr: any) {
        let flag = arr.filter((item: any) => this.checkArr.includes(item)).length > 0;
        if (arr.length && arr.length > 1 && !flag) {
            let len = this.contentDiv!.childNodes.length + 1;
            let str = arr.join(',');
            this.checkArr = [...arr];
            this.mapGroup.set(`group${len}`, arr)
            this.contentDiv!.innerHTML += `<div>group${len}:${str}</div>`;
        }

    }
    //手动核分组容器内容
    getGroupTableLine(str?: string) {
        this.initGroupStatus = true;
        this.cpuTbl!.innerHTML = '';
        this.creatCpuHeaderDiv();
        let switchArr = Object.values(CORE_JSON).flat();
        for (let i = 0; i < (window as any).cpuCount; i++) {
            let obj = {
                cpu: i,
                isCheck: (window as any).cpuCount == CORE_NUM && str !== 'cut' ? switchArr.includes(i) : this.checkArr.includes(i)
            };
            this.creatGroupLineDIv(obj);
        }
    }

    creatCpuHeaderDiv() {
        let cpuIdLine = document.createElement('div');
        cpuIdLine.className = 'core_line';
        cpuIdLine.style.fontWeight = 'bold';
        cpuIdLine.style.fontStyle = '12px';
        cpuIdLine.textContent = 'Cpu';
        cpuIdLine.style.textAlign = 'center';
        this.cpuTbl?.append(...[cpuIdLine]);
    }
    //添加容器中Tbl的cpu Line值
    creatGroupLineDIv(obj: any) {
        let id = `${obj.cpu}`.toString();
        let checkBoxId = `box${id}`;
        // 创建一个包裹div来容纳checkbox和cpuLine  
        let wrapperDiv = document.createElement('div');
        wrapperDiv.className = 'check-content';
        wrapperDiv.id = checkBoxId;
        // 创建checkBox实例   
        let checkBox: LitCheckBox = new LitCheckBox();
        checkBox.checked = obj.isCheck;
        checkBox.setAttribute('not-close', '');
        // 添加事件监听器到checkBox  
        checkBox.addEventListener('change', (e: any) => {
            // checkBox.disabled = true;
            checkBox.checked = e.detail.checked;
            this.canUpdateCheckList(e.detail.checked, this.addGroupArr, obj.cpu);
        });
        wrapperDiv.appendChild(checkBox);
        // 创建cpuLine div  
        let cpuLine = document.createElement('div');
        cpuLine.textContent = obj.cpu + '';
        cpuLine.style.textAlign = 'center';
        cpuLine.style.fontWeight = 'normal';
        // 将cpuLine也添加到wrapperDiv 
        wrapperDiv.appendChild(cpuLine);
        this.cpuTbl!.append(wrapperDiv);
    }


    //回调函数，首次插入DOM时执行的初始化回调
    connectedCallback(): void {
        new ResizeObserver(() => {
            if (this.parentElement?.clientHeight !== 0) {
                // @ts-ignore
                this.parallelTable!.shadowRoot!.querySelector('.table')!.style.height = this.parentElement!.clientHeight - 50 + 'px';
                this.parallelTable?.reMeauseHeight();
                if (this.parentElement!.clientHeight >= 0 && this.parentElement!.clientHeight <= 31) {
                    this.bottomFilterEl!.style.display = 'none';
                } else {
                    this.bottomFilterEl!.style.display = 'flex';
                }
            }
        }).observe(this.parentElement!);
    }
    initHtml(): string {
        return MtSettingHtml;
    }
}
