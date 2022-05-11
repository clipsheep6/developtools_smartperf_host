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

import {cpu, CpuStruct, WakeupBean} from "./ProcedureWorkerCPU.js";
import {drawFlagLine, drawLines, ns2s, ns2x, Rect} from "./ProcedureWorkerCommon.js";
import {CpuFreqStruct, freq} from "./ProcedureWorkerFreq.js";
import {proc, ProcessStruct} from "./ProcedureWorkerProcess.js";
import {mem, ProcessMemStruct} from "./ProcedureWorkerMem.js";
import {thread, ThreadStruct} from "./ProcedureWorkerThread.js";
import {func, FuncStruct} from "./ProcedureWorkerFunc.js";
import {fps, FpsStruct} from "./ProcedureWorkerFPS.js";
import {heap, HeapStruct} from "./ProcedureWorkerHeap.js";
import {timeline} from "./ProcedureWorkerTimeline.js";

let dataList: any = {}
let dataFilter: any = {}
let canvasList: any = {}
let contextList: any = {}

function drawSelection(context: any, params: any) {
    if (params.isRangeSelect) {
        params.rangeSelectObject!.startX = Math.floor(ns2x(params.rangeSelectObject!.startNS!, params.startNS, params.endNS, params.totalNS, params.frame));
        params.rangeSelectObject!.endX = Math.floor(ns2x(params.rangeSelectObject!.endNS!, params.startNS, params.endNS, params.totalNS, params.frame));
        if (context) {
            context.globalAlpha = 0.5
            context.fillStyle = "#666666"
            context.fillRect(params.rangeSelectObject!.startX!, params.frame.y, params.rangeSelectObject!.endX! - params.rangeSelectObject!.startX!, params.frame.height)
            context.globalAlpha = 1
        }
    }
}

function drawWakeUp(context: CanvasRenderingContext2D | any, wake: WakeupBean | null, startNS: number, endNS: number, totalNS: number, frame: Rect, selectCpuStruct: CpuStruct | undefined = undefined, currentCpu: number | undefined = undefined) {
    if (wake) {
        let x1 = Math.floor(ns2x((wake.wakeupTime || 0), startNS, endNS, totalNS, frame));
        context.beginPath();
        context.lineWidth = 2;
        context.fillStyle = "#000000";
        if (x1 > 0 && x1 < frame.x + frame.width) {
            context.moveTo(x1, frame.y);
            context.lineTo(x1, frame.y + frame.height);
            if (currentCpu == wake.cpu) {
                let centerY = Math.floor(frame.y + frame.height / 2);
                context.moveTo(x1, centerY - 6);
                context.lineTo(x1 + 4, centerY);
                context.lineTo(x1, centerY + 6);
                context.lineTo(x1 - 4, centerY);
                context.lineTo(x1, centerY - 6);
                context.fill();
            }
        }
        if (selectCpuStruct) {
            let x2 = Math.floor(ns2x((selectCpuStruct.startTime || 0), startNS, endNS, totalNS, frame));
            let y = frame.y + frame.height - 10;
            context.moveTo(x1, y);
            context.lineTo(x2, y);

            let s = ns2s((selectCpuStruct.startTime || 0) - (wake.wakeupTime || 0));
            let distance = x2 - x1;
            if (distance > 12) {
                context.moveTo(x1, y);
                context.lineTo(x1 + 6, y - 3);
                context.moveTo(x1, y);
                context.lineTo(x1 + 6, y + 3);
                context.moveTo(x2, y);
                context.lineTo(x2 - 6, y - 3);
                context.moveTo(x2, y);
                context.lineTo(x2 - 6, y + 3);
                let measure = context.measureText(s);
                let tHeight = measure.actualBoundingBoxAscent + measure.actualBoundingBoxDescent
                let xStart = x1 + Math.floor(distance / 2 - measure.width / 2);
                if (distance > measure.width + 4) {
                    context.fillStyle = "#ffffff"
                    context.fillRect(xStart - 2, y - 4 - tHeight, measure.width + 4, tHeight + 4);
                    context.font = "10px solid";
                    context.fillStyle = "#000000";
                    context.textBaseline = "bottom";
                    context.fillText(s, xStart, y - 2);
                }

            }
        }
        context.strokeStyle = "#000000";
        context.stroke();
        context.closePath();
    }
}

self.onmessage = function (e: any) {
    if ((e.data.type as string).startsWith("clear")) {
        dataList = {};
        dataFilter = {};
        canvasList = {};
        contextList = {};
        // @ts-ignore
        self.postMessage({
            id: e.data.id,
            type: e.data.type,
            results: null,
        });
        return;
    }
    let res: any
    if (e.data.params.list) {
        dataList[e.data.type] = e.data.params.list;
        dataFilter[e.data.type] = new Set();
        if (e.data.params.offscreen) {
            canvasList[e.data.type] = e.data.params.offscreen;
            contextList[e.data.type] = e.data.params.offscreen!.getContext('2d');
            contextList[e.data.type].scale(e.data.params.dpr, e.data.params.dpr);
        }
    }
    if(!dataFilter[e.data.type]){
        dataFilter[e.data.type] = new Set();
    }
    let canvas = canvasList[e.data.type];
    let context = contextList[e.data.type];
    let type = e.data.type as string;
    let params = e.data.params;
    let isRangeSelect = e.data.params.isRangeSelect;
    let isHover = e.data.params.isHover;
    let xs = e.data.params.xs;
    let frame = e.data.params.frame;
    let flagMoveInfo = e.data.params.flagMoveInfo;
    let flagSelectedInfo = e.data.params.flagSelectedInfo;
    let hoverX = e.data.params.hoverX;
    let hoverY = e.data.params.hoverY;
    let startNS = e.data.params.startNS;
    let endNS = e.data.params.endNS;
    let totalNS = e.data.params.totalNS;
    let canvasWidth = e.data.params.canvasWidth;
    let canvasHeight = e.data.params.canvasHeight;
    let useCache = e.data.params.useCache;
    let lineColor = e.data.params.lineColor;
    let wakeupBean: WakeupBean | null = e.data.params.wakeupBean;
    if (canvas) {
        if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            context.scale(e.data.params.dpr, e.data.params.dpr);
        }
    }
    if (type.startsWith("timeline")) {
        timeline(canvas, context, startNS, endNS, totalNS, frame,
            e.data.params.keyPressCode, e.data.params.keyUpCode,
            e.data.params.mouseDown, e.data.params.mouseUp,
            e.data.params.mouseMove, e.data.params.mouseOut,
            e.data.params.offsetLeft, e.data.params.offsetTop,
            (a: any) => {
                //@ts-ignore
                self.postMessage({
                    id: "timeline",
                    type: "timeline-range-changed",
                    results: a,
                });
            }
        );
        // @ts-ignore
        self.postMessage({
            id: e.data.id,
            type: type,
            results: null,
        });
    } else if (type.startsWith("cpu")) {
        if (!useCache) {
            cpu(dataList[type], dataFilter[type], startNS, endNS, totalNS, frame);
        }
        if (canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            drawLines(context, xs, frame.height, lineColor);
            CpuStruct.hoverCpuStruct = undefined;
            if (isHover) {
                for (let re of dataFilter[e.data.type]) {
                    if (hoverX >= re.frame.x && hoverX <= re.frame.x + re.frame.width && hoverY >= re.frame.y && hoverY <= re.frame.y + re.frame.height) {
                        CpuStruct.hoverCpuStruct = re;
                        break;
                    }
                }
            } else {
                CpuStruct.hoverCpuStruct = e.data.params.hoverCpuStruct;
            }
            CpuStruct.selectCpuStruct = e.data.params.selectCpuStruct;
            for (let re of dataFilter[type]) {
                CpuStruct.draw(context, re);
            }
            drawSelection(context, params);
            context.closePath();
            drawFlagLine(context, flagMoveInfo, flagSelectedInfo, startNS, endNS, totalNS, frame);
            let currentCpu = parseInt(type.replace("cpu", ""));
            drawWakeUp(context, wakeupBean, startNS, endNS, totalNS, frame, type == `cpu${CpuStruct.selectCpuStruct?.cpu || 0}` ? CpuStruct.selectCpuStruct : undefined, currentCpu);
        }
        // @ts-ignore
        self.postMessage({
            id: e.data.id,
            type: type,
            results: canvas ? undefined : dataFilter[type],
            hover: CpuStruct.hoverCpuStruct
        });
    } else if (type.startsWith("fps")) {
        if (!useCache) {
            fps(dataList[type], dataFilter[type], startNS, endNS, totalNS, frame);
        }
        if (canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            drawLines(context, xs, frame.height, lineColor)
            for (let re of dataFilter[type]) {
                FpsStruct.draw(context, re)
            }
            drawSelection(context, params);
            context.closePath();
            let maxFps = FpsStruct.maxFps + "FPS"
            let textMetrics = context.measureText(maxFps);
            context.globalAlpha = 0.8
            context.fillStyle = "#f0f0f0"
            context.fillRect(0, 5, textMetrics.width + 8, 18)
            context.globalAlpha = 1
            context.fillStyle = "#333"
            context.textBaseline = "middle"
            context.fillText(maxFps, 4, 5 + 9);
            drawWakeUp(context, wakeupBean, startNS, endNS, totalNS, frame);
            drawFlagLine(context, flagMoveInfo, flagSelectedInfo, startNS, endNS, totalNS, frame);
        }
        // @ts-ignore
        self.postMessage({id: e.data.id, type: type, results: canvas ? undefined : dataFilter[type], hover: undefined});
    } else if (type.startsWith("freq")) {
        if (!useCache) {
            freq(dataList[type], dataFilter[type], startNS, endNS, totalNS, frame)
        }
        if (canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            CpuFreqStruct.maxFreq = e.data.params.maxFreq;
            CpuFreqStruct.maxFreqName = e.data.params.maxFreqName;
            drawLines(context, xs, frame.height, lineColor)
            CpuFreqStruct.hoverCpuFreqStruct = undefined;
            if (isHover) {
                for (let re of dataFilter[type]) {
                    if (hoverX >= re.frame.x && hoverX <= re.frame.x + re.frame.width && hoverY >= re.frame.y && hoverY <= re.frame.y + re.frame.height) {
                        CpuFreqStruct.hoverCpuFreqStruct = re;
                        break;
                    }
                }
            } else {
                CpuFreqStruct.hoverCpuFreqStruct = e.data.params.hoverCpuFreqStruct;
            }
            CpuFreqStruct.selectCpuFreqStruct = e.data.params.selectCpuFreqStruct;
            for (let re of dataFilter[type]) {
                CpuFreqStruct.draw(context, re)
            }
            drawSelection(context, params);
            context.closePath();
            let s = CpuFreqStruct.maxFreqName
            let textMetrics = context.measureText(s);
            context.globalAlpha = 0.8
            context.fillStyle = "#f0f0f0"
            context.fillRect(0, 5, textMetrics.width + 8, 18)
            context.globalAlpha = 1
            context.fillStyle = "#333"
            context.textBaseline = "middle"
            context.fillText(s, 4, 5 + 9)
            drawWakeUp(context, wakeupBean, startNS, endNS, totalNS, frame);
            drawFlagLine(context, flagMoveInfo, flagSelectedInfo, startNS, endNS, totalNS, frame);
        }
        // @ts-ignore
        self.postMessage({
            id: e.data.id,
            type: type,
            results: canvas ? undefined : dataFilter[type],
            hover: CpuFreqStruct.hoverCpuFreqStruct
        });
    } else if (type.startsWith("process")) {
        if (!useCache) {
            proc(dataList[type], dataFilter[type], startNS, endNS, totalNS, frame)
        }
        if (canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            CpuStruct.cpuCount = e.data.params.cpuCount;
            drawLines(context, xs, frame.height, lineColor)
            for (let re of dataFilter[type]) {
                ProcessStruct.draw(context, re)
            }
            drawSelection(context, params);
            drawWakeUp(context, wakeupBean, startNS, endNS, totalNS, frame);
            context.closePath();
            drawFlagLine(context, flagMoveInfo, flagSelectedInfo, startNS, endNS, totalNS, frame);
        }
        // @ts-ignore
        self.postMessage({id: e.data.id, type: type, results: canvas ? undefined : dataFilter[type], hover: undefined});
    } else if (type.startsWith("heap")) {
        if (!useCache) {
            heap(dataList[type], dataFilter[type], startNS, endNS, totalNS, frame);
        }
        if (canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            drawLines(context, xs, frame.height, lineColor)
            HeapStruct.hoverHeapStruct = undefined;
            if (isHover) {
                for (let re of dataFilter[e.data.type]) {
                    if (hoverX >= re.frame.x && hoverX <= re.frame.x + re.frame.width && hoverY >= re.frame.y && hoverY <= re.frame.y + re.frame.height) {
                        HeapStruct.hoverHeapStruct = re;
                        break;
                    }
                }
            } else {
                HeapStruct.hoverHeapStruct = e.data.params.hoverHeapStruct;
            }
            // HeapStruct.selectHeapStruct = e.data.params.selectHeapStruct;
            for (let re of dataFilter[type]) {
                HeapStruct.draw(context, re)
            }
            drawSelection(context, params);
            drawWakeUp(context, wakeupBean, startNS, endNS, totalNS, frame);
            context.closePath();
            drawFlagLine(context, flagMoveInfo, flagSelectedInfo, startNS, endNS, totalNS, frame);
        }
        // @ts-ignore
        self.postMessage({
            id: e.data.id,
            type: type,
            results: canvas ? undefined : dataFilter[type],
            hover: HeapStruct.hoverHeapStruct
        });
    } else if (type.startsWith("mem")) {
        if (!useCache) {
            mem(dataList[type], dataFilter[type], startNS, endNS, totalNS, frame)
        }
        if (canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            drawLines(context, xs, frame.height, lineColor)
            for (let re of dataFilter[type]) {
                ProcessMemStruct.draw(context, re)
            }
            drawSelection(context, params);
            drawWakeUp(context, wakeupBean, startNS, endNS, totalNS, frame);
            context.closePath();
            drawFlagLine(context, flagMoveInfo, flagSelectedInfo, startNS, endNS, totalNS, frame);
        }
        // @ts-ignore
        self.postMessage({id: e.data.id, type: type, results: canvas ? undefined : dataFilter[type], hover: undefined});
    } else if (type.startsWith("thread")) {
        if (!useCache) {
            thread(dataList[type], dataFilter[type], startNS, endNS, totalNS, frame)
        }
        if (canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            drawLines(context, xs, frame.height, lineColor)
            ThreadStruct.hoverThreadStruct = undefined;
            if (isHover) {
                for (let re of dataFilter[e.data.type]) {
                    if (hoverX >= re.frame.x && hoverX <= re.frame.x + re.frame.width && hoverY >= re.frame.y && hoverY <= re.frame.y + re.frame.height) {
                        ThreadStruct.hoverThreadStruct = re;
                        break;
                    }
                }
            } else {
                ThreadStruct.hoverThreadStruct = e.data.params.hoverThreadStruct;
            }
            ThreadStruct.selectThreadStruct = e.data.params.selectThreadStruct;
            for (let re of dataFilter[type]) {
                ThreadStruct.draw(context, re)
            }
            drawSelection(context, params);
            drawWakeUp(context, wakeupBean, startNS, endNS, totalNS, frame);
            context.closePath();
            drawFlagLine(context, flagMoveInfo, flagSelectedInfo, startNS, endNS, totalNS, frame);
        }
        // @ts-ignore
        self.postMessage({
            id: e.data.id,
            type: type,
            results: canvas ? undefined : dataFilter[type],
            hover: ThreadStruct.hoverThreadStruct
        });
    } else if (type.startsWith("func")) {
        if (!useCache) {
            func(dataList[type], dataFilter[type], startNS, endNS, totalNS, frame)
        }
        if (canvas) {
            if (canvas.height == 150) {
                canvas.width = frame.width;
                canvas.height = e.data.params.maxHeight;
                context.scale(e.data.params.dpr, e.data.params.dpr);
            }
            // canvasList[type]!.width = frame.width;
            // canvasList[type]!.height = frame.height;
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            drawLines(context, xs, frame.height, lineColor)
            FuncStruct.hoverFuncStruct = undefined;
            if (isHover) {
                for (let re of dataFilter[type]) {
                    if (re.dur && re.dur > 0 && hoverX >= re.frame.x && hoverX <= re.frame.x + re.frame.width && hoverY >= re.frame.y + (re.depth * 20) && hoverY <= re.frame.y + re.frame.height + (re.depth * 20)) {
                        FuncStruct.hoverFuncStruct = re;
                        break;
                    }
                }
            } else {
                FuncStruct.hoverFuncStruct = e.data.params.hoverFuncStruct;
            }
            FuncStruct.selectFuncStruct = e.data.params.selectFuncStruct;
            for (let re of dataFilter[type]) {
                FuncStruct.draw(context, re)
            }
            drawSelection(context, params);
            drawWakeUp(context, wakeupBean, startNS, endNS, totalNS, frame);
            context.closePath();
            drawFlagLine(context, flagMoveInfo, flagSelectedInfo, startNS, endNS, totalNS, frame);
        }
        // @ts-ignore
        self.postMessage({
            id: e.data.id,
            type: type,
            results: canvas ? undefined : dataFilter[type],
            hover: FuncStruct.hoverFuncStruct
        });
    } else if (type.startsWith("native")) {
        if (canvas) {
            context.clearRect(0, 0, canvas.width, canvas.height);
            context.beginPath();
            drawLines(context, xs, frame.height, lineColor)
            drawSelection(context, params);
            context.closePath();
            drawFlagLine(context, flagMoveInfo, flagSelectedInfo, startNS, endNS, totalNS, frame);
        }
        // @ts-ignore
        self.postMessage({
            id: e.data.id,
            type: type,
            results: canvas ? undefined : dataFilter[type],
            hover: ThreadStruct.hoverThreadStruct
        });
    }
};
self.onmessageerror = function (e: any) {
}




