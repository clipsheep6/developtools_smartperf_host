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

import {BaseElement, element} from "../../base-ui/BaseElement.js";
import "./trace/TimerShaftElement.js";
import "./trace/base/TraceRow.js";
import {
    getAsyncEvents,
    getCpuUtilizationRate,
    getFps,
    getFunDataByTid,
    getStatesProcessThreadData,
    getStatesProcessThreadDataCount,
    queryCpuData,
    queryCpuFreq,
    queryCpuFreqData,
    queryCpuMax,
    queryCpuMaxFreq,
    queryHeapAllTable,
    queryHeapByEventType,
    queryHeapByPid,
    queryHeapFrameCount,
    queryHeapGroupByEvent,
    queryHeapPid,
    queryNativeHookProcess,
    queryProcess,
    queryProcessData,
    queryProcessMem,
    queryProcessMemData,
    queryProcessThreads,
    queryThreadData,
    queryTotalTime,
    threadPool
} from "../database/SqlLite.js";
import {TraceRow} from "./trace/base/TraceRow.js";
import {TimerShaftElement} from "./trace/TimerShaftElement.js";
import {CpuStruct} from "../bean/CpuStruct.js";
import {CpuFreqStruct} from "../bean/CpuFreqStruct.js";
import {ProcessStruct} from "../bean/ProcessStruct.js";
import {ColorUtils} from "./trace/base/ColorUtils.js";
import "./trace/base/TraceSheet.js";
import {TraceSheet} from "./trace/base/TraceSheet.js";
import {ThreadStruct} from "../bean/ThreadStruct.js";
import {ProcessMemStruct} from "../bean/ProcessMemStruct.js";
import {FuncStruct} from "../bean/FuncStruct.js";
import {FpsStruct} from "../bean/FpsStruct.js";
import {RangeSelect} from "./trace/base/RangeSelect.js";
import {SelectionParam} from "../bean/BoxSelection.js";
import {HeapStruct} from "../bean/HeapStruct.js";
import {procedurePool} from "../database/Procedure.js";
import {Utils} from "./trace/base/Utils.js";
import {SpApplication} from "../SpApplication.js";
import {SPT} from "../bean/StateProcessThread.js";
import {HeapTreeDataBean} from "../bean/HeapTreeDataBean.js";
import {Flag} from "./trace/timer-shaft/Flag.js";
import {SportRuler} from "./trace/timer-shaft/SportRuler.js";
import {NativeEventHeap} from "../bean/NativeHook.js";

@element('sp-system-trace')
export class SpSystemTrace extends BaseElement {
    static scrollViewWidth = 0
    static isCanvasOffScreen = true;
    static SPT_DATA: Array<SPT> = [];
    static EVENT_HEAP: Array<NativeEventHeap> = [];
    static HEAP_FRAME_DATA: Array<HeapTreeDataBean> = [];
    rowsEL: HTMLDivElement | undefined | null;
    spacerEL: HTMLDivElement | undefined | null;
    visibleRows: Array<TraceRow<any>> = [];
    keyboardEnable = true;
    currentRowType = "";/*保存当前鼠标所在行的类型*/
    observerScrollHeightEnable: boolean = false;
    observerScrollHeightCallback: Function | undefined;
    // @ts-ignore
    observer = new ResizeObserver((entries) => {
        if (this.observerScrollHeightEnable && this.observerScrollHeightCallback) {
            this.observerScrollHeightCallback();
        }
    });
    isMousePointInSheet = false;
    hoverFlag: Flag | undefined | null = undefined
    selectFlag: Flag | undefined | null = undefined
    public timerShaftEL: TimerShaftElement | null | undefined;
    private traceSheetEL: TraceSheet | undefined | null;
    private rangeSelect!: RangeSelect;
    private processThreads: Array<ThreadStruct> = []
    private processAsyncEvent: Array<ProcessMemStruct> = []
    private processMem: Array<any> = []

    initElements(): void {
        this.rowsEL = this.shadowRoot?.querySelector<HTMLDivElement>('.rows');
        this.spacerEL = this.shadowRoot?.querySelector<HTMLDivElement>('.spacer');
        this.timerShaftEL = this.shadowRoot?.querySelector('.timer-shaft');
        this.traceSheetEL = this.shadowRoot?.querySelector('.trace-sheet');
        this.rangeSelect = new RangeSelect(this.timerShaftEL);
        this.rangeSelect.rowsEL = this.rowsEL;
        document?.addEventListener("triangle-flag", (event: any) => {
            this.timerShaftEL?.drawTriangle(event.detail.time, event.detail.type);
        })

        document?.addEventListener("flag-change", (event: any) => {
            this.timerShaftEL?.modifyFlagList(event.detail)
            if (event.detail.hidden) {
                this.selectFlag = undefined;
                this.traceSheetEL?.setAttribute("mode", 'hidden');
                this.visibleRows.forEach(it => it.draw(true));
            }
        })

        SpSystemTrace.scrollViewWidth = this.getScrollWidth();
        this.rangeSelect.selectHandler = (rows, refreshCheckBox) => {
            if (rows.length == 0) {
                this.rowsEL!.querySelectorAll<TraceRow<any>>("trace-row").forEach(it => {
                    it.checkType = "-1"
                })
                this.getVisibleRows().forEach(it => {
                    it.draw(true);
                });
                this.traceSheetEL?.setAttribute("mode", 'hidden');
                return;
            }
            if (refreshCheckBox) {
                if (rows.length > 0) {
                    this.rowsEL?.querySelectorAll<TraceRow<any>>("trace-row").forEach(row => row.checkType = "0")
                    rows.forEach(it => it.checkType = "2")
                } else {
                    this.rowsEL?.querySelectorAll<TraceRow<any>>("trace-row").forEach(row => row.checkType = "-1")
                    return
                }
            }
            let selection = new SelectionParam();
            selection.cpus = [];
            selection.threadIds = [];
            selection.funTids = [];
            selection.trackIds = [];
            selection.leftNs = 0;
            selection.rightNs = 0;
            let native_memory = ["All Heap & Anonymous VM", "All Heap", "All Anonymous VM"];
            rows.forEach(it => {
                if (it.rowType == TraceRow.ROW_TYPE_CPU) {
                    selection.cpus.push(parseInt(it.rowId!))
                } else if (it.rowType == TraceRow.ROW_TYPE_PROCESS) {
                    this.rowsEL?.querySelectorAll<TraceRow<any>>(`trace-row[row-parent-id='${it.rowId}']`).forEach(th => {
                        th.rangeSelect = true;
                        th.checkType = "2"
                        selection.threadIds.push(parseInt(th.rowId!))
                    })
                } else if (it.rowType == TraceRow.ROW_TYPE_NATIVE_MEMORY) {
                    this.rowsEL?.querySelectorAll<TraceRow<any>>(`trace-row[row-parent-id='${it.rowId}']`).forEach(th => {
                        th.rangeSelect = true;
                        th.checkType = "2"
                        selection.nativeMemory.push(th.rowId!);
                    })
                }else if (it.rowType == TraceRow.ROW_TYPE_THREAD) {
                    selection.threadIds.push(parseInt(it.rowId!))
                } else if (it.rowType == TraceRow.ROW_TYPE_FUNC) {
                    selection.funTids.push(parseInt(it.rowId!))
                } else if (it.rowType == TraceRow.ROW_TYPE_MEM) {
                    selection.trackIds.push(parseInt(it.rowId!))
                } else if (it.rowType == TraceRow.ROW_TYPE_FPS) {
                    selection.hasFps = true;
                } else if (it.rowType == TraceRow.ROW_TYPE_HEAP) {
                    if (native_memory.indexOf(it.rowId ?? "") != -1) {
                        selection.nativeMemory.push(it.rowId!);
                    } else {
                        selection.heapIds.push(parseInt(it.rowId!))
                    }
                }
            })
            selection.leftNs = TraceRow.rangeSelectObject?.startNS || 0;
            selection.rightNs = TraceRow.rangeSelectObject?.endNS || 0;
            this.traceSheetEL?.boxSelection(selection);
        }
        // @ts-ignore
        new ResizeObserver((entries) => {
            let width = entries[0].contentRect.width - 1 - SpSystemTrace.scrollViewWidth;
            requestAnimationFrame(() => {
                this.timerShaftEL?.updateWidth(width)
                this.shadowRoot!.querySelectorAll<TraceRow<any>>("trace-row").forEach(it => it.updateWidth(width))
            })
        }).observe(this);

        new ResizeObserver((entries) => {
            this.getVisibleRows().forEach(it => {
                it.draw(true);
            });
            if (this.traceSheetEL!.getAttribute("mode") == "hidden") {
                this.timerShaftEL?.removeTriangle("triangle")
            }
        }).observe(this.rowsEL!);
    }

    getScrollWidth() {
        let totalScrollDiv, scrollDiv, overflowDiv = document.createElement('div');
        overflowDiv.style.cssText = 'position:absolute; top:-2000px;width:200px; height:200px; overflow:hidden;';
        totalScrollDiv = document.body.appendChild(overflowDiv).clientWidth;
        overflowDiv.style.overflowY = 'scroll';
        scrollDiv = overflowDiv.clientWidth;
        document.body.removeChild(overflowDiv);
        return totalScrollDiv - scrollDiv;
    }

    getVisibleRows(): Array<TraceRow<any>> {
        let scrollTop = this.rowsEL?.scrollTop || 0;
        let scrollHeight = this.rowsEL?.clientHeight || 0;
        let res = [...this.rowsEL!.querySelectorAll<TraceRow<any>>("trace-row")].filter((it) => {
            let tr = (it as TraceRow<any>);
            let top = it.offsetTop - (this.rowsEL?.offsetTop || 0);
            if ((top + it.clientHeight > scrollTop && top + it.clientHeight < scrollTop + scrollHeight + it.clientHeight) || it.collect) {
                it.sleeping = false;
                return true
            } else {
                if (!it.hasAttribute("collect-type")) {
                    it.sleeping = true;
                }
                return false;
            }
        })
        this.visibleRows = res;
        return res;
    }

    timerShaftELFlagClickHandler = (flag: Flag | undefined | null) => {
        if (flag) {
            setTimeout(() => {
                this.traceSheetEL?.displayFlagData(flag);
            }, 100)
        }
    }

    timerShaftELFlagChange = (hoverFlag: Flag | undefined | null, selectFlag: Flag | undefined | null) => {
        this.hoverFlag = hoverFlag;
        this.selectFlag = selectFlag;
        this.visibleRows.forEach(it => it.draw(true));
    }

    timerShaftELRangeChange = (e: any) => {
        TraceRow.range = e;
        //在rowsEL显示范围内的 trace-row组件将收到时间区间变化通知
        for (let i = 0; i < this.visibleRows.length; i++) {
            this.visibleRows[i].draw();
        }
    }

    rowsElOnScroll = (e: any) => {
        this.hoverStructNull();
        this.visibleRows = this.getVisibleRows();
        for (let index = 0; index < this.visibleRows.length; index++) {
            if (index == 0 || index == this.visibleRows.length - 1) {
                this.visibleRows[index].isHover = false;
            }
        }
    }

    documentOnMouseDown = (ev: MouseEvent) => {
        if (this.isMouseInSheet(ev)) return;
        this.observerScrollHeightEnable = false;
        if (ev.offsetX > this.timerShaftEL!.canvas!.offsetLeft) {
            this.rangeSelect.mouseDown(ev)
            this.timerShaftEL?.documentOnMouseDown(ev)
            this.visibleRows.forEach(it => {
                it.draw();
            })
        }
    }

    documentOnMouseUp = (ev: MouseEvent) => {
        this.rangeSelect.isMouseDown = false;
        if (this.isMouseInSheet(ev)) return;
            this.rangeSelect.mouseUp(ev);
            this.timerShaftEL?.documentOnMouseUp(ev)
    }

    documentOnMouseOut = (ev: MouseEvent) => {
        if (this.isMouseInSheet(ev)) return;
        if (ev.offsetX > this.timerShaftEL!.canvas!.offsetLeft) {
            this.timerShaftEL?.documentOnMouseOut(ev)
        }
    }

    documentOnKeyPress = (ev: KeyboardEvent) => {
        if (this.isMousePointInSheet) {
            return;
        }
        this.observerScrollHeightEnable = false;
        this.keyboardEnable && this.timerShaftEL!.documentOnKeyPress(ev);
    }

    documentOnKeyUp = (ev: KeyboardEvent) => {
        if (this.isMousePointInSheet) {
            return;
        }
        this.observerScrollHeightEnable = false;
        this.keyboardEnable && this.timerShaftEL!.documentOnKeyUp(ev);
        if (ev.code == "Enter") {
            if (ev.shiftKey) {
                this.dispatchEvent(new CustomEvent("previous-data", {
                    detail: {}
                }));
            } else {
                this.dispatchEvent(new CustomEvent("next-data", {
                    detail: {}
                }));
            }
        }
    }

    isMouseInSheet = (ev: MouseEvent) => {
        this.isMousePointInSheet = this.traceSheetEL?.getAttribute("mode") != "hidden" && ev.offsetX > this.traceSheetEL!.offsetLeft && ev.offsetY > this.traceSheetEL!.offsetTop;
        return this.isMousePointInSheet;
    }

    favoriteChangeHandler = (row: TraceRow<any>) => {
        this.getVisibleRows();
    }

    selectChangeHandler = (rows: Array<TraceRow<any>>) => {
        this.rangeSelect.rangeTraceRow = rows;
        this.rangeSelect.selectHandler?.(this.rangeSelect.rangeTraceRow, false);
    }

    documentOnMouseMove = (ev: MouseEvent) => {
        if (this.isMouseInSheet(ev)) return;
        let rows = this.visibleRows;
        if (this.timerShaftEL?.isScaling()) {
            return;
        }
        this.timerShaftEL?.documentOnMouseMove(ev)
        this.rangeSelect.mouseMove(rows, ev);
        if (this.rangeSelect.isMouseDown) {
            for (let i = 0; i < rows.length; i++) {
                rows[i].tipEL!.style.display = "none";
                rows[i].draw(true);
            }
        } else {
            for (let i = 0; i < rows.length; i++) {
                let tr = rows[i];
                let rowsELScrollTop = this.rowsEL?.scrollTop || 0;
                let x = ev.offsetX - (tr.canvasContainer?.offsetLeft || 0);
                let y = ev.offsetY - (tr.canvasContainer?.offsetTop || 0) + rowsELScrollTop;
                if ((!tr.collect && x > tr.frame.x && x < tr.frame.x + tr.frame.width && ev.offsetY + rowsELScrollTop > tr.offsetTop && ev.offsetY + rowsELScrollTop < tr.offsetTop + tr.frame.height) ||
                    (tr.collect && x > tr.frame.x && x < tr.frame.x + tr.frame.width && ev.offsetY > tr.offsetTop - 48 && ev.offsetY < tr.offsetTop - 48 + tr.frame.height)) {
                    tr.isHover = true;
                    tr.hoverX = x;
                    tr.hoverY = tr.collect ? (ev.offsetY + 48 - tr.offsetTop) : y;
                    if (tr.rowType === TraceRow.ROW_TYPE_CPU) {
                        this.currentRowType = TraceRow.ROW_TYPE_CPU;
                        if (CpuStruct.hoverCpuStruct) {
                            tr.tip = `<span>P：${CpuStruct.hoverCpuStruct.processName || "Process"} [${CpuStruct.hoverCpuStruct.processId}]</span><span>T：${CpuStruct.hoverCpuStruct.name} [${CpuStruct.hoverCpuStruct.tid}]</span>`;
                        }
                        tr.setTipLeft(x, CpuStruct.hoverCpuStruct)
                    } else if (tr.rowType === TraceRow.ROW_TYPE_CPU_FREQ) {
                        this.currentRowType = TraceRow.ROW_TYPE_CPU_FREQ;
                        if (CpuFreqStruct.hoverCpuFreqStruct) {
                            tr.tip = `<span>${ColorUtils.formatNumberComma(CpuFreqStruct.hoverCpuFreqStruct.value!)} kHz</span>`
                        }
                        tr.setTipLeft(x, CpuFreqStruct.hoverCpuFreqStruct)
                    } else if (tr.rowType === TraceRow.ROW_TYPE_THREAD) {
                        this.currentRowType = TraceRow.ROW_TYPE_THREAD;
                    } else if (tr.rowType === TraceRow.ROW_TYPE_FUNC) {
                        this.currentRowType = TraceRow.ROW_TYPE_FUNC;
                    } else if (tr.rowType === TraceRow.ROW_TYPE_HEAP) {
                        this.currentRowType = TraceRow.ROW_TYPE_HEAP;
                        if (HeapStruct.hoverHeapStruct) {
                            if (tr.drawType === 1) {
                                tr.tip = `<span>${HeapStruct.hoverHeapStruct.heapsize}</span>`
                            } else {
                                tr.tip = `<span>${Utils.getByteWithUnit(HeapStruct.hoverHeapStruct.heapsize!)}</span>`
                            }
                        }
                        tr.setTipLeft(x, HeapStruct.hoverHeapStruct)
                    } else {
                        this.hoverStructNull();
                    }
                    tr.draw(true);
                } else {
                    tr.onMouseLeave(x, y);
                    tr.isHover = false;
                    tr.hoverX = x;
                    tr.hoverY = y;
                }

            }
            if (ev.offsetX > this.timerShaftEL!.canvas!.offsetLeft!
                && ev.offsetX < this.timerShaftEL!.canvas!.offsetLeft! + this.timerShaftEL!.canvas!.offsetWidth!
                && ev.offsetY > this.rowsEL!.offsetTop
                && ev.offsetY < this.rowsEL!.offsetTop + this.rowsEL!.offsetHeight
            ) {
            } else {
                this.hoverStructNull();
                for (let i = 0, len = rows.length; i < len; i++) {
                    if (!(rows[i].rowType === TraceRow.ROW_TYPE_PROCESS) && this.currentRowType === rows[i].rowType) { //
                        rows[i].draw(true);
                    }
                }
            }
        }
    }

    hoverStructNull() {
        CpuStruct.hoverCpuStruct = undefined;
        CpuFreqStruct.hoverCpuFreqStruct = undefined;
        ThreadStruct.hoverThreadStruct = undefined;
        FuncStruct.hoverFuncStruct = undefined;
    }

    selectStructNull() {
        CpuStruct.selectCpuStruct = undefined;
        CpuStruct.wakeupBean = null;
        CpuFreqStruct.selectCpuFreqStruct = undefined;
        ThreadStruct.selectThreadStruct = undefined;
        FuncStruct.selectFuncStruct = undefined;
    }

    documentOnClick = (ev: MouseEvent) => {
        if (this.isMouseInSheet(ev)) return;
        if (this.rangeSelect.isDrag()) {
            return;
        }
        this.onClickHandler();
        this.documentOnMouseMove(ev)
    }

    onClickHandler(){
        this.rowsEL?.querySelectorAll<TraceRow<any>>("trace-row").forEach(it => it.rangeSelect = false)
        this.selectStructNull();
        let threadClickHandler: any;
        let cpuClickHandler: any;
        threadClickHandler = (d: ThreadStruct) => {
            this.observerScrollHeightEnable = false;
            this.goProcess(`${d.cpu}`, "", "cpu", true);
            let row = this.shadowRoot!.querySelector<TraceRow<any>>(`trace-row[row-id='${d.pid}'][row-type='process'][folder]`);
            if (row) {
                row.expansion = false;
            }
            let cpuRow = this.rowsEL?.querySelectorAll<TraceRow<CpuStruct>>(`trace-row[row-id='${d.cpu}'][row-type='cpu']`)[0];
            let findEntry = cpuRow!.dataList!.find(it => it.startTime === d.startTime);
            this.hoverStructNull();
            this.selectStructNull();
            CpuStruct.hoverCpuStruct = findEntry;
            CpuStruct.selectCpuStruct = findEntry;
            cpuRow!.draw();
            this.traceSheetEL?.displayCpuData(CpuStruct.selectCpuStruct!, (wakeUpBean) => {
                CpuStruct.wakeupBean = wakeUpBean;
                this.visibleRows.forEach(it => it.draw());
            }, cpuClickHandler);
        }
        let scrollTimer: any;
        cpuClickHandler = (d: CpuStruct) => {
            this.observerScrollHeightEnable = true;
            let threadRow = this.rowsEL?.querySelectorAll<TraceRow<ThreadStruct>>(`trace-row[row-id='${d.tid}'][row-type='thread']`)[0];
            this.goProcess(`${d.tid}`, `${d.processId}`, "thread", true)
            this.observerScrollHeightCallback = () => {
                if (threadRow!.isComplete) {
                    let findEntry = threadRow!.dataList!.find((dat) => dat.startTime === d.startTime);
                    this.hoverStructNull();
                    this.selectStructNull();
                    ThreadStruct.hoverThreadStruct = findEntry;
                    ThreadStruct.selectThreadStruct = findEntry;
                    threadRow!.draw();
                    this.traceSheetEL?.displayThreadData(ThreadStruct.selectThreadStruct!, threadClickHandler);
                    // clearTimeout(scrollTimer);
                    this.goProcess(`${d.tid}`, `${d.processId}`, "thread", true)
                } else {
                    threadRow!.onComplete = () => {
                        let findEntry = threadRow!.dataList!.find((dat) => dat.startTime === d.startTime);
                        this.hoverStructNull();
                        this.selectStructNull();
                        ThreadStruct.hoverThreadStruct = findEntry;
                        ThreadStruct.selectThreadStruct = findEntry;
                        threadRow!.draw();
                        this.traceSheetEL?.displayThreadData(ThreadStruct.selectThreadStruct!, threadClickHandler);
                        clearTimeout(scrollTimer);
                        scrollTimer = setTimeout(() => this.goProcess(`${d.tid}`, `${d.processId}`, "thread", false), 100)
                    }
                }
            }
        }

        if (CpuStruct.hoverCpuStruct) {
            CpuStruct.selectCpuStruct = CpuStruct.hoverCpuStruct
            this.traceSheetEL?.displayCpuData(CpuStruct.selectCpuStruct, (wakeUpBean) => {
                CpuStruct.wakeupBean = wakeUpBean;
                this.visibleRows.forEach(it => it.draw());
            }, cpuClickHandler);
            this.timerShaftEL?.modifyFlagList(undefined);
        } else if (ThreadStruct.hoverThreadStruct) {
            ThreadStruct.selectThreadStruct = ThreadStruct.hoverThreadStruct;
            this.traceSheetEL?.displayThreadData(ThreadStruct.selectThreadStruct, threadClickHandler);
            this.timerShaftEL?.modifyFlagList(undefined);
        } else if (FuncStruct.hoverFuncStruct) {
            FuncStruct.selectFuncStruct = FuncStruct.hoverFuncStruct;
            this.traceSheetEL?.displayFuncData(FuncStruct.hoverFuncStruct)
            this.timerShaftEL?.modifyFlagList(undefined);
        } else {
            this.observerScrollHeightEnable = false;
            this.selectFlag = null;
            if (!SportRuler.isMouseInSportRuler) {
                this.traceSheetEL?.setAttribute("mode", 'hidden');
                this.getVisibleRows().forEach(it => it.draw(true));
            }
        }
    }

    connectedCallback() {
        /**
         * 监听时间轴区间变化
         */
        this.timerShaftEL!.rangeChangeHandler = this.timerShaftELRangeChange;
        this.timerShaftEL!.flagChangeHandler = this.timerShaftELFlagChange;
        this.timerShaftEL!.flagClickHandler = this.timerShaftELFlagClickHandler;
        /**
         * 监听rowsEL的滚动时间，刷新可见区域的trace-row组件的时间区间（将触发trace-row组件重绘）
         */
        this.rowsEL?.addEventListener('scroll', this.rowsElOnScroll)
        /**
         * 监听document的mousemove事件 坐标通过换算后找到当前鼠标所在的trace-row组件，将坐标传入
         */
        this.addEventListener('mousemove', this.documentOnMouseMove)
        this.addEventListener('click', this.documentOnClick)
        this.addEventListener('mousedown', this.documentOnMouseDown)
        this.addEventListener('mouseup', this.documentOnMouseUp)
        this.addEventListener('mouseout', this.documentOnMouseOut)
        document.addEventListener('keypress', this.documentOnKeyPress)
        document.addEventListener('keyup', this.documentOnKeyUp)
        SpApplication.skinChange2 = (val: boolean) => {
            this.timerShaftEL?.render()
            this.rowsEL!.querySelectorAll<TraceRow<any>>(`trace-row:not([sleeping])`).forEach(it => {
                this.hoverStructNull();
                it.draw();
            })
        }
    }

    goProcess(rowId: string, rowParentId: string, rowType: string, smooth: boolean = true) {
        let row = this.shadowRoot!.querySelector<TraceRow<any>>(`trace-row[row-id='${rowParentId}'][folder]`);
        if (row) {
            row.expansion = true
        }
        let rootRow = this.shadowRoot!.querySelector<TraceRow<any>>(`trace-row[row-id='${rowId}'][row-type='${rowType}']`);
        this.rowsEL!.scroll({
            top: rootRow!.offsetTop - this.rowsEL!.offsetTop - this.rowsEL!.offsetHeight + rootRow!.offsetHeight,
            left: 0,
            behavior: smooth ? "smooth" : undefined
        })
    }

    rowScrollTo(offset: number, callback: Function) {
        const fixedOffset = offset;
        const onScroll = () => {
            if (this.rowsEL!.scrollTop === fixedOffset) {
                this.rowsEL!.removeEventListener('scroll', onScroll)
                callback()
            }
        }

        this.rowsEL!.addEventListener('scroll', onScroll)
        onScroll()
        this.rowsEL!.scrollTo({
            top: offset,
            behavior: 'smooth'
        })
    }

    disconnectedCallback() {
        this.timerShaftEL?.removeEventListener('range-change', this.timerShaftELRangeChange);
        this.rowsEL?.removeEventListener('scroll', this.rowsElOnScroll);
        this.removeEventListener('mousemove', this.documentOnMouseMove);
        this.removeEventListener('click', this.documentOnClick);
        this.removeEventListener('mousedown', this.documentOnMouseDown)
        this.removeEventListener('mouseup', this.documentOnMouseUp)
        this.removeEventListener('mouseout', this.documentOnMouseOut)
        document.removeEventListener('keypress', this.documentOnKeyPress)
        document.removeEventListener('keyup', this.documentOnKeyUp)
    }

    loadDatabaseUrl(url: string, progress: Function, complete?: ((res: { status: boolean, msg: string }) => void) | undefined) {
        this.init({url: url}, progress).then((res) => {
            if (complete) {
                complete(res);
            }
        })
    }

    loadDatabaseArrayBuffer(buf: ArrayBuffer, progress: ((name: string, percent: number) => void), complete?: ((res: { status: boolean, msg: string }) => void) | undefined) {
        this.init({buf}, progress).then((res) => {
            let scrollTop = this.rowsEL?.scrollTop || 0
            let scrollHeight = this.rowsEL?.clientHeight || 0
            this.rowsEL?.querySelectorAll("trace-row").forEach((it: any) => {
                this.observer.observe(it);
            })
            if (complete) {
                complete(res);
            }
        })
    }

    search(query: string) {
        this.shadowRoot?.querySelectorAll<TraceRow<any>>('trace-row').forEach(item => {
            if (query == null || query == undefined || query == '') {
                if (item.rowType == TraceRow.ROW_TYPE_CPU ||
                    item.rowType == TraceRow.ROW_TYPE_CPU_FREQ ||
                    item.rowType == TraceRow.ROW_TYPE_NATIVE_MEMORY ||
                    item.rowType == TraceRow.ROW_TYPE_FPS ||
                    item.rowType == TraceRow.ROW_TYPE_PROCESS) {
                    item.expansion = false;
                    item.rowHidden = false;
                } else {
                    item.rowHidden = true;
                }
            } else {
                if (item.name.toLowerCase().indexOf(query.toLowerCase()) >= 0) {
                    item.rowHidden = false;
                } else {
                    item.rowHidden = true;
                }
            }
        })
        this.getVisibleRows().forEach(it => it.rowHidden = false && it.draw(true))
    }

    searchCPU(query: string): Array<CpuStruct> {
        let searchResults: Array<CpuStruct> = []
        this.rowsEL!.querySelectorAll<TraceRow<any>>(`trace-row[row-type='cpu']`).forEach(item => {
            let res = item!.dataList!.filter(it => (it.name && it.name.search(query) >= 0) || it.tid == query
                || it.processId == query
                || (it.processName && it.processName.search(query) >= 0)
            )
            searchResults.push(...res);
        })
        searchResults.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));
        return searchResults;
    }

    showPreCpuStruct(currentIndex: number, cpuStructs: Array<CpuStruct>): number {
        if (cpuStructs.length == 0) {
            return 0;
        }
        let findIndex = -1;
        for (let i = cpuStructs.length - 1; i >= 0; i--) {
            let it = cpuStructs[i];
            if (i < currentIndex && (it.startTime!) >= (TraceRow.range!.startNS) && (it.startTime!) + (it.dur!) <= (TraceRow.range!.endNS)) {
                findIndex = i;
                break;
            }
        }
        if (findIndex >= 0) {
            let findEntry = cpuStructs[findIndex];
            CpuStruct.selectCpuStruct = findEntry;
            this.rowsEL!.querySelectorAll<TraceRow<any>>(`trace-row[row-type='cpu']`).forEach(item =>{
                item.highlight = item.rowId == `${findEntry.cpu}`;
                item.draw(true);
            })
            this.timerShaftEL?.drawTriangle(findEntry.startTime||0, "inverted");
        } else {
            for (let i = cpuStructs.length - 1; i >= 0; i--) {
                let it = cpuStructs[i];
                if ((it.startTime! + it.dur!) < (TraceRow.range!.startNS)) {
                    findIndex = i;
                    break;
                }
            }
            let findEntry: CpuStruct;
            if (findIndex == -1) {
                findIndex = cpuStructs.length - 1;
            }
            findEntry = cpuStructs[findIndex];
            CpuStruct.selectCpuStruct = findEntry;
            let startNS = this.timerShaftEL?.getRange()?.startNS || 0;
            let endNS = this.timerShaftEL?.getRange()?.endNS || 0;
            let harfDur = Math.trunc((endNS - startNS) / 2 - findEntry.dur! / 2);
            this.timerShaftEL?.setRangeNS(findEntry.startTime! - harfDur, findEntry.startTime! + findEntry.dur! + harfDur);
            this.rowsEL!.querySelectorAll<TraceRow<any>>(`trace-row[row-type='cpu']`).forEach(item => {
                item.highlight = item.rowId == `${findEntry.cpu}`;
                item.draw(true)
            })
            this.timerShaftEL?.drawTriangle(findEntry.startTime||0, "inverted");
        }
        CpuStruct.hoverCpuStruct = CpuStruct.selectCpuStruct;
        this.onClickHandler();
        return findIndex;
    }

    showNextCpuStruct(currentIndex: number, cpuStructs: Array<CpuStruct>): number {
        if (cpuStructs.length == 0) {
            return 0;
        }
        let findIndex = cpuStructs.findIndex((it, idx) => {
            return idx > currentIndex && (it.startTime!) >= (TraceRow.range!.startNS) && (it.startTime!) + (it.dur!) <= (TraceRow.range!.endNS)
        })
        if (findIndex >= 0) {
            let findEntry = cpuStructs[findIndex];
            CpuStruct.selectCpuStruct = findEntry;
            this.rowsEL!.querySelectorAll<TraceRow<any>>(`trace-row[row-type='cpu']`).forEach(item =>{
                item.highlight = item.rowId == `${findEntry.cpu}`;
                item.draw(true);
            })
            this.timerShaftEL?.drawTriangle(findEntry.startTime||0, "inverted");
        } else {
            findIndex = cpuStructs.findIndex((it) => (it.startTime!) > (TraceRow.range!.endNS))
            let findEntry: CpuStruct;
            if (findIndex == -1) {
                findIndex = 0;
            }
            findEntry = cpuStructs[findIndex];
            CpuStruct.selectCpuStruct = findEntry;
            let startNS = this.timerShaftEL?.getRange()?.startNS || 0;
            let endNS = this.timerShaftEL?.getRange()?.endNS || 0;
            let harfDur = Math.trunc((endNS - startNS) / 2 - findEntry.dur! / 2);
            this.timerShaftEL?.setRangeNS(findEntry.startTime! - harfDur, findEntry.startTime! + findEntry.dur! + harfDur);
            this.rowsEL!.querySelectorAll<TraceRow<any>>(`trace-row[row-type='cpu']`).forEach(item => {
                item.highlight = item.rowId == `${findEntry.cpu}`;
                item.draw(true);
            })
            this.timerShaftEL?.drawTriangle(findEntry.startTime||0, "inverted");
        }
        CpuStruct.hoverCpuStruct = CpuStruct.selectCpuStruct;
        this.onClickHandler();
        return findIndex;
    }

    reset(progress: Function | undefined | null) {
        if (this.rowsEL) this.rowsEL.innerHTML = ''
        this.spacerEL!.style.height = '0px';
        this.rangeSelect.rangeTraceRow = [];
        CpuStruct.wakeupBean = undefined;
        this.selectStructNull();
        this.hoverStructNull();
        this.traceSheetEL?.setAttribute("mode", "hidden")
        progress && progress("rest timershaft", 8);
        this.timerShaftEL?.reset();
        progress && progress("clear cache", 10);
        procedurePool.clearCache();
    }

    init = async (param: { buf?: ArrayBuffer, url?: string }, progress: Function) => {
        progress("Load database", 6);
        this.reset(progress);
        if (param.buf) {
            let {status, msg} = await threadPool.initSqlite(param.buf, progress);
            if (!status) {
                return {status: false, msg: msg}
            }
        }
        if (param.url) {
            let {status, msg} = await threadPool.initServer(param.url, progress);
            if (!status) {
                return {status: false, msg: msg}
            }
        }

        progress("load process threads", 50);
        this.processThreads = await queryProcessThreads();
        progress("process memory", 60);
        this.processMem = await queryProcessMem()
        progress("async event", 63);
        this.processAsyncEvent = await getAsyncEvents()
        progress("time range", 65);
        await this.initTotalTime();
        progress("cpu", 70);
        await this.initCpu();
        progress("cpu rate", 75);
        await this.initCpuRate();
        progress("cpu freq", 80);
        await this.initCpuFreq();
        progress("fps", 85);
        await this.initFPS();
        progress("native memory", 87);
        await this.initNativeMemory();
        progress("process", 90);
        await this.initProcess();
        progress("process", 93);
        await this.initProcessThreadStateData(progress);
        await this.initHeapStateData(progress)
        progress("display", 95);
        this.getVisibleRows().forEach(it => {
            it.draw();
        });
        this.processThreads.length = 0;
        this.processMem.length = 0;
        this.processAsyncEvent.length = 0;
        this.rowsEL?.querySelectorAll<TraceRow<any>>("trace-row").forEach((it: any) => {
            it.addEventListener('expansion-change', () => {
                this.getVisibleRows().forEach(it2 => it2.draw());
            })
        })
        progress("completed", 100);
        return {status: true, msg: "success"}
    }

    initCpuRate = async () => {
        let rates = await getCpuUtilizationRate(0, this.timerShaftEL?.totalNS || 0);
        if (this.timerShaftEL) this.timerShaftEL.cpuUsage = rates;
    }

    initTotalTime = async () => {
        let res = await queryTotalTime();
        if (this.timerShaftEL) {
            this.timerShaftEL.totalNS = res[0].total
            this.timerShaftEL.loadComplete = true;
        }
    }

    initCpu = async () => {
        let array = await queryCpuMax();
        if (array && array.length > 0 && array[0]) {
            let cpuMax = array[0].cpu
            CpuStruct.cpuCount = cpuMax + 1;
            for (let i1 = 0; i1 < CpuStruct.cpuCount; i1++) {
                const cpuId = i1;
                let traceRow = new TraceRow<CpuStruct>({
                    canvasNumber: 1,
                    alpha: true,
                    contextId: '2d',
                    isOffScreen: SpSystemTrace.isCanvasOffScreen
                });
                traceRow.rowId = `${cpuId}`
                traceRow.rowType = TraceRow.ROW_TYPE_CPU
                traceRow.rowParentId = ''
                traceRow.style.height = '40px'
                traceRow.name = `Cpu ${cpuId}`
                traceRow.favoriteChangeHandler = this.favoriteChangeHandler;
                traceRow.selectChangeHandler = this.selectChangeHandler;
                traceRow.supplier = () => queryCpuData(cpuId, 0, this.timerShaftEL?.totalNS || 0)
                traceRow.onThreadHandler = ((useCache: boolean) => {
                    procedurePool.submitWithName(`cpu${cpuId % procedurePool.cpusLen.length}`, `cpu${cpuId}`, {
                        list: traceRow.must ? traceRow.dataList : undefined,
                        offscreen: traceRow.must ? traceRow.offscreen[0] : undefined,//是否离屏
                        dpr: traceRow.dpr,//屏幕dpr值
                        xs: TraceRow.range?.xs,//线条坐标信息
                        isHover: traceRow.isHover,
                        flagMoveInfo: this.hoverFlag,
                        flagSelectedInfo: this.selectFlag,
                        hoverX: traceRow.hoverX,
                        hoverY: traceRow.hoverY,
                        canvasWidth: traceRow.canvasWidth,
                        canvasHeight: traceRow.canvasHeight,
                        hoverCpuStruct: CpuStruct.hoverCpuStruct,
                        selectCpuStruct: CpuStruct.selectCpuStruct,
                        wakeupBean: CpuStruct.wakeupBean,
                        isRangeSelect: traceRow.rangeSelect,
                        rangeSelectObject: TraceRow.rangeSelectObject,
                        useCache: useCache,
                        lineColor: traceRow.getLineColor(),
                        startNS: TraceRow.range?.startNS || 0,
                        endNS: TraceRow.range?.endNS || 0,
                        totalNS: TraceRow.range?.totalNS || 0,
                        frame: traceRow.frame
                    }, traceRow.must && traceRow.args.isOffScreen ? traceRow.offscreen[0] : undefined, (res: any, hover: any) => {
                        traceRow.must = false;
                        if (traceRow.args.isOffScreen == true) {
                            if (traceRow.isHover) {
                                CpuStruct.hoverCpuStruct = hover;
                                this.visibleRows.filter(it => it.rowType === TraceRow.ROW_TYPE_CPU && it.name !== traceRow.name).forEach(it => it.draw(true));
                            }
                            return;
                        }
                    })
                })
                this.rowsEL?.appendChild(traceRow)
            }
        }
    }

    initCpuFreq = async () => {
        let freqList = await queryCpuFreq();
        let freqMaxList = await queryCpuMaxFreq();
        CpuFreqStruct.maxFreq = freqMaxList[0].maxFreq;
        let math = () => {
            let units: Array<string> = ["", "K", "M", "G", "T", "E"];
            let sb = " ";
            CpuFreqStruct.maxFreqName = " ";
            if (CpuFreqStruct.maxFreq > 0) {
                let log10: number = Math.ceil(Math.log10(CpuFreqStruct.maxFreq));
                let pow10: number = Math.pow(10, log10);
                let afterCeil: number = Math.ceil(CpuFreqStruct.maxFreq / (pow10 / 4)) * (pow10 / 4);
                CpuFreqStruct.maxFreq = afterCeil;
                let unitIndex: number = Math.floor(log10 / 3);
                sb = `${afterCeil / Math.pow(10, unitIndex * 3)}${units[unitIndex + 1]}hz`
            }
            CpuFreqStruct.maxFreqName = sb.toString();
        }
        math();
        for (let i = 0; i < freqList.length; i++) {
            const it = freqList[i];
            let traceRow = new TraceRow<CpuFreqStruct>({
                canvasNumber: 1,
                alpha: true,
                contextId: '2d',
                isOffScreen: SpSystemTrace.isCanvasOffScreen
            });
            traceRow.rowId = `${it.cpu}`
            traceRow.rowType = TraceRow.ROW_TYPE_CPU_FREQ
            traceRow.rowParentId = ''
            traceRow.style.height = '40px'
            traceRow.name = `Cpu ${it.cpu} Frequency`;
            traceRow.favoriteChangeHandler = this.favoriteChangeHandler;
            traceRow.selectChangeHandler = this.selectChangeHandler;
            traceRow.supplier = () => queryCpuFreqData(it.cpu)
            traceRow.onThreadHandler = (useCache) => {
                procedurePool.submitWithName(`freq${it.cpu % procedurePool.freqLen.length}`, `freq${it.cpu}`, {
                    list: traceRow.must ? traceRow.dataList : undefined,
                    offscreen: traceRow.must ? traceRow.offscreen[0] : undefined,
                    xs: TraceRow.range?.xs,
                    dpr: traceRow.dpr,
                    isHover: traceRow.isHover,
                    flagMoveInfo: this.hoverFlag,
                    flagSelectedInfo: this.selectFlag,
                    hoverX: traceRow.hoverX,
                    hoverY: traceRow.hoverY,
                    canvasWidth: traceRow.canvasWidth,
                    canvasHeight: traceRow.canvasHeight,
                    hoverCpuFreqStruct: CpuFreqStruct.hoverCpuFreqStruct,
                    selectCpuFreqStruct: CpuFreqStruct.selectCpuFreqStruct,
                    wakeupBean: CpuStruct.wakeupBean,
                    isRangeSelect: traceRow.rangeSelect,
                    rangeSelectObject: TraceRow.rangeSelectObject,
                    maxFreq: CpuFreqStruct.maxFreq,
                    maxFreqName: CpuFreqStruct.maxFreqName,
                    useCache: useCache,
                    lineColor: traceRow.getLineColor(),
                    startNS: TraceRow.range?.startNS || 0,
                    endNS: TraceRow.range?.endNS || 0,
                    totalNS: TraceRow.range?.totalNS || 0,
                    frame: traceRow.frame
                }, traceRow.must && traceRow.args.isOffScreen ? traceRow.offscreen[0] : undefined, (res: any, hover: any) => {
                    traceRow.must = false;
                    if (traceRow.args.isOffScreen == true) {
                        if (traceRow.isHover) {
                            CpuFreqStruct.hoverCpuFreqStruct = hover;
                            this.visibleRows.filter(it => it.rowType === TraceRow.ROW_TYPE_CPU_FREQ && it.name !== traceRow.name).forEach(it => it.draw(true));
                        }
                        return;
                    }
                })

            }
            this.rowsEL?.appendChild(traceRow)
        }
    }

    initFPS = async () => {
        let fpsRow = new TraceRow<FpsStruct>({canvasNumber: 1, alpha: true, contextId: '2d', isOffScreen: true});
        fpsRow.rowId = `fps`
        fpsRow.rowType = TraceRow.ROW_TYPE_FPS
        fpsRow.rowParentId = ''
        FpsStruct.maxFps = 0
        fpsRow.style.height = '40px'
        fpsRow.name = "FPS"
        fpsRow.supplier = () => getFps()
        fpsRow.favoriteChangeHandler = this.favoriteChangeHandler;
        fpsRow.selectChangeHandler = this.selectChangeHandler;
        fpsRow.onThreadHandler = (useCache) => {
            procedurePool.submitWithName(`process0`, `fps0`, {
                list: fpsRow.must ? fpsRow.dataList : undefined,
                offscreen: fpsRow.must ? fpsRow.offscreen[0] : undefined,
                xs: TraceRow.range?.xs,
                dpr: fpsRow.dpr,
                isHover: fpsRow.isHover,
                flagMoveInfo: this.hoverFlag,
                flagSelectedInfo: this.selectFlag,
                hoverX: fpsRow.hoverX,
                hoverY: fpsRow.hoverY,
                canvasWidth: fpsRow.canvasWidth,
                canvasHeight: fpsRow.canvasHeight,
                wakeupBean: CpuStruct.wakeupBean,
                isRangeSelect: fpsRow.rangeSelect,
                rangeSelectObject: TraceRow.rangeSelectObject,
                useCache: useCache,
                lineColor: fpsRow.getLineColor(),
                startNS: TraceRow.range?.startNS || 0,
                endNS: TraceRow.range?.endNS || 0,
                totalNS: TraceRow.range?.totalNS || 0,
                frame: fpsRow.frame
            }, fpsRow.must && fpsRow.args.isOffScreen ? fpsRow.offscreen[0] : undefined, (res: any, hover: any) => {
                fpsRow.must = false;
            })
        }
        this.rowsEL?.appendChild(fpsRow)
    }

    initNativeMemory = async () => {
        let nativeProcess = await queryNativeHookProcess();
        if (nativeProcess.length == 0) {
            return;
        }
        SpSystemTrace.EVENT_HEAP = await queryHeapGroupByEvent();
        let nativeRow = new TraceRow({
            canvasNumber: 1,
            alpha: false,
            contextId: '2d',
            isOffScreen: SpSystemTrace.isCanvasOffScreen
        });
        let process = "";
        if (nativeProcess.length > 0) {
            process = ` ${nativeProcess[0].pid}`
        }
        nativeRow.rowId = `native-memory`
        nativeRow.index = 0;
        nativeRow.rowType = TraceRow.ROW_TYPE_NATIVE_MEMORY
        nativeRow.drawType = 0;
        nativeRow.rowParentId = '';
        nativeRow.folder = true;
        nativeRow.name = `Native Memory` + process;
        nativeRow.favoriteChangeHandler = this.favoriteChangeHandler;
        nativeRow.selectChangeHandler = this.selectChangeHandler;
        nativeRow.onDrawTypeChangeHandler = (type) => {
            this.rowsEL?.querySelectorAll<TraceRow<any>>(`trace-row[row-type='heap']`).forEach(it => {
                it.drawType = type;
                it.isComplete = false;
                it.draw();
            })
        };
        nativeRow.supplier = () => new Promise<Array<any>>((resolve, reject) => resolve([]));
        nativeRow.onThreadHandler = (useCache) => {
            procedurePool.submitWithName(`process${nativeRow.index}`, `native-memory`, {
                list: nativeRow.must ? nativeRow.dataList : undefined,
                offscreen: nativeRow.must ? nativeRow.offscreen[0] : undefined,
                xs: TraceRow.range?.xs,
                dpr: nativeRow.dpr,
                isHover: nativeRow.isHover,
                flagMoveInfo: this.hoverFlag,
                flagSelectedInfo: this.selectFlag,
                hoverX: nativeRow.hoverX,
                hoverY: nativeRow.hoverY,
                canvasWidth: nativeRow.canvasWidth,
                canvasHeight: nativeRow.canvasHeight,
                isRangeSelect: nativeRow.rangeSelect,
                rangeSelectObject: TraceRow.rangeSelectObject,
                useCache: useCache,
                lineColor: nativeRow.getLineColor(),
                startNS: TraceRow.range?.startNS || 0,
                endNS: TraceRow.range?.endNS || 0,
                totalNS: TraceRow.range?.totalNS || 0,
                frame: nativeRow.frame
            }, nativeRow.must && nativeRow.args.isOffScreen ? nativeRow.offscreen[0] : undefined, (res: any) => {
                nativeRow.must = false;
            })
        }

        this.rowsEL?.appendChild(nativeRow)
        /**
         * 添加heap信息
         */
        let native_memory = ["All Heap & Anonymous VM", "All Heap", "All Anonymous VM"];
        for (let i = 0; i < native_memory.length; i++) {
            let nm = native_memory[i];
            let allHeapRow = new TraceRow<HeapStruct>({
                canvasNumber: 1,
                alpha: false,
                contextId: '2d',
                isOffScreen: true
            });
            allHeapRow.index = i;
            allHeapRow.rowParentId = `native-memory`
            allHeapRow.rowHidden = !nativeRow.expansion
            allHeapRow.style.height = '40px'
            allHeapRow.name = nm;
            allHeapRow.rowId = nm;
            allHeapRow.drawType = 0;
            allHeapRow.folder = false;
            allHeapRow.rowType = TraceRow.ROW_TYPE_HEAP;
            allHeapRow.favoriteChangeHandler = this.favoriteChangeHandler;
            allHeapRow.selectChangeHandler = this.selectChangeHandler;
            allHeapRow.setAttribute('children', '')
            let arg1 = "";
            let arg2 = "";
            if (nm == "All Heap") {
                arg1 = "where event_type = 'AllocEvent' or event_type = 'FreeEvent'"
                arg2 = "and (event_type = 'AllocEvent' or event_type = 'FreeEvent')"
            } else if (nm == "All Anonymous VM") {
                arg1 = "where event_type = 'MmapEvent' or event_type = 'MunmapEvent'"
                arg2 = "and (event_type = 'MmapEvent' or event_type = 'MunmapEvent')"
            } else {
                arg1 = ""
                arg2 = ""
            }
            allHeapRow.supplier = () => {
                if (allHeapRow.drawType === 0) {
                    return queryHeapByEventType(0, TraceRow.range?.totalNS || 0, arg1, arg2);
                } else {
                    return queryHeapByEventType(0, TraceRow.range?.totalNS || 0, arg1, arg2).then(res => {
                        let arr: Array<HeapStruct> = [];
                        if (res.length > 0) {
                            let first = new HeapStruct();
                            first.startTime = res[0].startTime;
                            first.endTime = res[0].endTime;
                            first.dur = res[0].dur;
                            first.eventType = res[0].eventType;
                            if (first.eventType == "AllocEvent" || first.eventType == "MmapEvent") {
                                first.heapsize = 1;
                            } else {
                                first.heapsize = -1;
                            }
                            arr.push(first);
                            let max = first.heapsize;
                            let min = first.heapsize;
                            for (let i = 1, len = res.length; i < len; i++) {
                                let heap = new HeapStruct();
                                heap.startTime = res[i].startTime;
                                heap.endTime = res[i].endTime;
                                heap.eventType = res[i].eventType;
                                arr[i - 1].dur = heap.startTime! - arr[i - 1].startTime!;
                                if (i == len - 1) {
                                    heap.dur = TraceRow.range?.totalNS! - heap.startTime!;
                                }
                                if (heap.eventType == "AllocEvent" || heap.eventType == "MmapEvent") {
                                    heap.heapsize = arr[i - 1].heapsize! + 1;
                                } else {
                                    heap.heapsize = arr[i - 1].heapsize! - 1;
                                }
                                if (heap.heapsize > max) {
                                    max = heap.heapsize;
                                }
                                if (heap.heapsize < min) {
                                    min = heap.heapsize;
                                }
                                arr.push(heap);
                            }
                            arr.map((heap) => {
                                heap.maxHeapSize = max;
                                heap.minHeapSize = min;
                            })
                        }
                        return arr;
                    })
                }
            }
            allHeapRow.onThreadHandler = (useCache) => {
                procedurePool.submitWithName(`process${allHeapRow.index}`, `heap-${nm}`, {
                    list: allHeapRow.must ? allHeapRow.dataList : undefined,
                    offscreen: !allHeapRow.isTransferCanvas ? allHeapRow.offscreen[0] : undefined,
                    xs: TraceRow.range?.xs,
                    dpr: allHeapRow.dpr,
                    isHover: allHeapRow.isHover,
                    flagMoveInfo: this.hoverFlag,
                    flagSelectedInfo: this.selectFlag,
                    hoverX: allHeapRow.hoverX,
                    hoverY: allHeapRow.hoverY,
                    canvasWidth: allHeapRow.canvasWidth,
                    canvasHeight: allHeapRow.canvasHeight,
                    isRangeSelect: allHeapRow.rangeSelect,
                    rangeSelectObject: TraceRow.rangeSelectObject,
                    useCache: useCache,
                    lineColor: allHeapRow.getLineColor(),
                    startNS: TraceRow.range?.startNS || 0,
                    endNS: TraceRow.range?.endNS || 0,
                    totalNS: TraceRow.range?.totalNS || 0,
                    frame: allHeapRow.frame
                }, !allHeapRow.isTransferCanvas ? allHeapRow.offscreen[0] : undefined, (res: any, hover: any) => {
                    allHeapRow.must = false;
                    allHeapRow.isTransferCanvas = true;
                    if (allHeapRow.isHover) {
                        HeapStruct.hoverHeapStruct = hover;
                    }
                })
            }
            this.rowsEL?.appendChild(allHeapRow)
        }
    }

    initProcessThreadStateData = async (progress: Function) => {
        SpSystemTrace.SPT_DATA = [];
        let res = await getStatesProcessThreadDataCount();
        let count: number = (res[0] as any).count;
        let pageSize = 500000;
        let pages = Math.ceil(count / pageSize);
        let percent = 93;
        for (let i = 0; i < pages; i++) {
            progress("StateProcessThread", percent + ((i + 1) / 100));
            let arr = await getStatesProcessThreadData(pageSize, i * pageSize);
            SpSystemTrace.SPT_DATA = SpSystemTrace.SPT_DATA.concat(arr);
        }
    }

    initHeapStateData = async (progress: Function) => {
        SpSystemTrace.HEAP_FRAME_DATA = [];
        let res = await queryHeapFrameCount();
        let count = 0;
        if (res != undefined && res.length > 0 && (res[0] as any).count != undefined) {
            count = (res[0] as any).count;
        }
        if (count > 0) {
            let pageSize = 500000;
            let pages = Math.ceil(count / pageSize);
            let percent = 94;
            for (let i = 0; i < pages; i++) {
                progress("StateHeap", percent + ((i + 1) / 100));
                let arr = await queryHeapAllTable(pageSize, i * pageSize);
                SpSystemTrace.HEAP_FRAME_DATA = SpSystemTrace.HEAP_FRAME_DATA.concat(arr);
            }
        }
    }

    /**
     * 添加进程信息
     */
    initProcess = async () => {
        let processList = await queryProcess();
        let heapPidList = await queryHeapPid()
        for (let i = 0; i < processList.length; i++) {
            const it = processList[i];
            let processRow = new TraceRow<ProcessStruct>({
                canvasNumber: 1,
                alpha: false,
                contextId: '2d',
                isOffScreen: SpSystemTrace.isCanvasOffScreen
            });
            processRow.rowId = `${it.pid}`
            processRow.index = i;
            processRow.rowType = TraceRow.ROW_TYPE_PROCESS
            processRow.rowParentId = '';
            processRow.folder = true;
            processRow.name = `${it.processName || "Process"} ${it.pid}`;
            processRow.supplier = () => queryProcessData(it.pid || -1, 0, TraceRow.range?.totalNS || 0);
            processRow.favoriteChangeHandler = this.favoriteChangeHandler;
            processRow.selectChangeHandler = this.selectChangeHandler;
            processRow.onThreadHandler = (useCache) => {
                procedurePool.submitWithName(`process${(processRow.index) % procedurePool.processLen.length}`, `process ${processRow.index} ${it.processName}`, {
                    list: processRow.must ? processRow.dataList : undefined,
                    offscreen: processRow.must ? processRow.offscreen[0] : undefined,
                    xs: TraceRow.range?.xs,
                    dpr: processRow.dpr,
                    isHover: processRow.isHover,
                    flagMoveInfo: this.hoverFlag,
                    flagSelectedInfo: this.selectFlag,
                    hoverX: processRow.hoverX,
                    hoverY: processRow.hoverY,
                    canvasWidth: processRow.canvasWidth,
                    canvasHeight: processRow.canvasHeight,
                    isRangeSelect: processRow.rangeSelect,
                    rangeSelectObject: TraceRow.rangeSelectObject,
                    wakeupBean: CpuStruct.wakeupBean,
                    cpuCount: CpuStruct.cpuCount,
                    useCache: useCache,
                    lineColor: processRow.getLineColor(),
                    startNS: TraceRow.range?.startNS || 0,
                    endNS: TraceRow.range?.endNS || 0,
                    totalNS: TraceRow.range?.totalNS || 0,
                    frame: processRow.frame
                }, processRow.must && processRow.args.isOffScreen ? processRow.offscreen[0] : undefined, (res: any) => {
                    processRow.must = false;
                })
            }
            this.rowsEL?.appendChild(processRow)
            /**
             * 添加进程内存信息
             */
            let processMem = this.processMem.filter(mem => mem.pid === it.pid);
            processMem.forEach(mem => {
                let row = new TraceRow<ProcessMemStruct>({
                    canvasNumber: 1,
                    alpha: false,
                    contextId: '2d',
                    isOffScreen: SpSystemTrace.isCanvasOffScreen
                });
                row.rowId = `${mem.trackId}`
                row.rowType = TraceRow.ROW_TYPE_MEM
                row.rowParentId = `${it.pid}`
                row.rowHidden = !processRow.expansion
                row.style.height = '40px'
                row.style.width = `100%`;
                row.name = `${mem.trackName}`;
                row.setAttribute('children', '');
                row.favoriteChangeHandler = this.favoriteChangeHandler;
                row.selectChangeHandler = this.selectChangeHandler;
                row.supplier = () => queryProcessMemData(mem.trackId).then(res => {
                    let maxValue = Math.max(...res.map(it => it.value || 0))
                    for (let j = 0; j < res.length; j++) {
                        res[j].maxValue = maxValue;
                        if (j == res.length - 1) {
                            res[j].duration = (TraceRow.range?.totalNS || 0) - (res[j].startTime || 0);
                        } else {
                            res[j].duration = (res[j + 1].startTime || 0) - (res[j].startTime || 0);
                        }
                        if (j > 0) {
                            res[j].delta = (res[j].value || 0) - (res[j - 1].value || 0);
                        } else {
                            res[j].delta = 0;
                        }
                    }
                    return res
                });
                row.onThreadHandler = (useCache) => {
                    procedurePool.submitWithName(`cpu${mem.trackId % procedurePool.cpusLen.length}`, `mem ${mem.trackId} ${mem.trackName}`, {
                        list: row.must ? row.dataList : undefined,
                        offscreen: row.must ? row.offscreen[0] : undefined,//是否离屏
                        dpr: row.dpr,//屏幕dpr值
                        xs: TraceRow.range?.xs,//线条坐标信息
                        isHover: row.isHover,
                        flagMoveInfo: this.hoverFlag,
                        flagSelectedInfo: this.selectFlag,
                        hoverX: row.hoverX,
                        hoverY: row.hoverY,
                        canvasWidth: row.canvasWidth,
                        canvasHeight: row.canvasHeight,
                        wakeupBean: CpuStruct.wakeupBean,
                        isRangeSelect: row.rangeSelect,
                        rangeSelectObject: TraceRow.rangeSelectObject,
                        useCache: useCache,
                        lineColor: row.getLineColor(),
                        startNS: TraceRow.range?.startNS || 0,
                        endNS: TraceRow.range?.endNS || 0,
                        totalNS: TraceRow.range?.totalNS || 0,
                        frame: row.frame
                    }, row.must && row.args.isOffScreen ? row.offscreen[0] : undefined, (res: any) => {
                        row.must = false;
                    })
                }
                this.rowsEL?.appendChild(row)
            });
            /**
             * 添加进程线程信息
             */
            let threads = this.processThreads.filter(thread => thread.pid === it.pid && thread.tid != 0 && thread.threadName != null);
            for (let j = 0; j < threads.length; j++) {
                let thread = threads[j];
                let threadRow = new TraceRow<ThreadStruct>({
                    canvasNumber: 1,
                    alpha: false,
                    contextId: '2d',
                    isOffScreen: SpSystemTrace.isCanvasOffScreen
                });
                threadRow.rowId = `${thread.tid}`
                threadRow.rowType = TraceRow.ROW_TYPE_THREAD
                threadRow.rowParentId = `${it.pid}`
                threadRow.rowHidden = !processRow.expansion
                threadRow.index = j
                threadRow.style.height = '30px'
                threadRow.setAttribute("height", `30`);
                threadRow.style.width = `100%`;
                threadRow.name = `${thread.threadName} ${thread.tid}`;
                threadRow.setAttribute('children', '')
                threadRow.favoriteChangeHandler = this.favoriteChangeHandler;
                threadRow.selectChangeHandler = this.selectChangeHandler;
                threadRow.supplier = () => queryThreadData(thread.tid || 0).then(res => {
                    getFunDataByTid(thread.tid || 0).then((funs: Array<FuncStruct>) => {
                        if (funs.length > 0) {
                            const groupedBy: Array<any> = [];
                            for (let i = 0; i < funs.length; i++) {
                                if (groupedBy[funs[i].depth || 0]) {
                                    groupedBy[funs[i].depth || 0].push(funs[i]);
                                } else {
                                    groupedBy[funs[i].depth || 0] = [funs[i]];
                                }
                            }
                            let max = Math.max(...funs.map(it => it.depth || 0)) + 1
                            let maxHeight = max * 20;
                            let funcRow = new TraceRow<FuncStruct>({
                                canvasNumber: max,
                                alpha: false,
                                contextId: '2d',
                                isOffScreen: SpSystemTrace.isCanvasOffScreen
                            });
                            funcRow.rowId = `${thread.tid}`
                            funcRow.rowType = TraceRow.ROW_TYPE_FUNC
                            funcRow.rowParentId = `${it.pid}`
                            funcRow.rowHidden = !processRow.expansion
                            funcRow.checkType = threadRow.checkType;
                            funcRow.style.width = `100%`;
                            funcRow.setAttribute("height", `${maxHeight}`);
                            funcRow.name = `${thread.threadName} ${thread.tid}`;
                            funcRow.setAttribute('children', '')
                            funcRow.supplier = () => new Promise((resolve, reject) => resolve(funs))
                            funcRow.favoriteChangeHandler = this.favoriteChangeHandler;
                            funcRow.selectChangeHandler = this.selectChangeHandler;
                            funcRow.onThreadHandler = (useCache) => {
                                for (let k = 0; k < groupedBy.length; k++) {
                                    procedurePool.submitWithName(`cpu${k % procedurePool.cpusLen.length}`, `func${thread.tid}${k}${thread.threadName}`, {
                                        list: funcRow.must ? groupedBy[k] : undefined,
                                        offscreen: funcRow.must ? funcRow.offscreen[k] : undefined,//是否离屏
                                        dpr: funcRow.dpr,//屏幕dpr值
                                        xs: TraceRow.range?.xs,//线条坐标信息
                                        isHover: funcRow.isHover,
                                        flagMoveInfo: this.hoverFlag,
                                        flagSelectedInfo: this.selectFlag,
                                        hoverX: funcRow.hoverX,
                                        hoverY: funcRow.hoverY,
                                        depth: k,
                                        canvasWidth: funcRow.canvasWidth,
                                        canvasHeight: funcRow.canvasHeight,
                                        maxHeight: maxHeight,
                                        hoverFuncStruct: FuncStruct.hoverFuncStruct,
                                        selectFuncStruct: FuncStruct.selectFuncStruct,
                                        wakeupBean: CpuStruct.wakeupBean,
                                        isRangeSelect: funcRow.rangeSelect,
                                        rangeSelectObject: TraceRow.rangeSelectObject,
                                        useCache: useCache,
                                        lineColor: funcRow.getLineColor(),
                                        startNS: TraceRow.range?.startNS || 0,
                                        endNS: TraceRow.range?.endNS || 0,
                                        totalNS: TraceRow.range?.totalNS || 0,
                                        frame: funcRow.frame
                                    }, funcRow.must && funcRow.args.isOffScreen ? funcRow.offscreen[k] : undefined, (res: any, hover: any) => {
                                        funcRow.must = false;
                                        if (funcRow.args.isOffScreen == true) {
                                            if (funcRow.isHover && hover) {
                                                FuncStruct.hoverFuncStruct = hover;
                                                // this.visibleRows.filter(it => it.rowType === TraceRow.ROW_TYPE_CPU && it.name !== traceRow.name).forEach(it => it.draw());
                                            }
                                            return;
                                        }
                                    })
                                }
                            }
                            this.insertAfter(funcRow, threadRow)
                            this.observer.observe(funcRow)
                            funcRow.draw();
                            this.getVisibleRows();//function 由于后插入dom，所以需要重新获取可见行
                        }
                    })
                    return res;
                })
                threadRow.onThreadHandler = (useCache) => {
                    procedurePool.submitWithName(`process${(threadRow.index) % procedurePool.processLen.length}`, `thread ${thread.tid} ${thread.threadName}`, {
                        list: threadRow.must ? threadRow.dataList : undefined,
                        offscreen: threadRow.must ? threadRow.offscreen[0] : undefined,//是否离屏
                        dpr: threadRow.dpr,//屏幕dpr值
                        xs: TraceRow.range?.xs,//线条坐标信息
                        isHover: threadRow.isHover,
                        flagMoveInfo: this.hoverFlag,
                        flagSelectedInfo: this.selectFlag,
                        hoverX: threadRow.hoverX,
                        hoverY: threadRow.hoverY,
                        canvasWidth: threadRow.canvasWidth,
                        canvasHeight: threadRow.canvasHeight,
                        hoverThreadStruct: ThreadStruct.hoverThreadStruct,
                        selectThreadStruct: ThreadStruct.selectThreadStruct,
                        wakeupBean: CpuStruct.wakeupBean,
                        isRangeSelect: threadRow.rangeSelect,
                        rangeSelectObject: TraceRow.rangeSelectObject,
                        useCache: useCache,
                        lineColor: threadRow.getLineColor(),
                        startNS: TraceRow.range?.startNS || 0,
                        endNS: TraceRow.range?.endNS || 0,
                        totalNS: TraceRow.range?.totalNS || 0,
                        frame: threadRow.frame
                    }, threadRow.must && threadRow.args.isOffScreen ? threadRow.offscreen[0] : undefined, (res: any, hover: any) => {
                        threadRow.must = false;
                        if (threadRow.args.isOffScreen == true) {
                            if (threadRow.isHover) {
                                ThreadStruct.hoverThreadStruct = hover;
                                // this.visibleRows.filter(it => it.rowType === TraceRow.ROW_TYPE_CPU && it.name !== traceRow.name).forEach(it => it.draw());
                            }
                            return;
                        }
                    })
                }
                this.rowsEL?.appendChild(threadRow)
            };
        }
    }

    insertAfter(newEl: HTMLElement, targetEl: HTMLElement) {
        let parentEl = targetEl.parentNode;
        if (parentEl!.lastChild == targetEl) {
            parentEl!.appendChild(newEl);
        } else {
            parentEl!.insertBefore(newEl, targetEl.nextSibling);
        }
    }

    initHtml(): string {
        return `
<style>
:host{
    display: block;
    width: 100%;
    height: 100%;
}
.timer-shaft{
    width: 100%;
    z-index: 2;
}
.rows{
     color: #fff;
    display: flex;
    box-sizing: border-box;
    flex-direction: column;
    /*overflow-y: auto;*/
    overflow: overlay;
    max-height: calc(100vh - 147px - 48px);
    flex: 1;
    width: 100%;
    background: var(--dark-background4,#ffffff);
    /*scroll-behavior: smooth;*/
}
.container{
    width: 100%;
    box-sizing: border-box;
    height: 100%;
    display: grid;
    grid-template-columns: 1fr;
    grid-template-rows: min-content min-content 1fr min-content;
}

</style>
<div class="container">
    <timer-shaft-element class="timer-shaft"></timer-shaft-element>
    <div class="spacer"></div>
    <div class="rows"></div>
    <trace-sheet class="trace-sheet" mode="hidden"></trace-sheet>
</div>
        `;
    }
}
