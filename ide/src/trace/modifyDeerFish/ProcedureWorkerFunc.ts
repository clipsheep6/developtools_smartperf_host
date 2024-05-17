export class FuncRender {
  renderMainThread(
    req: { useCache: boolean; context: CanvasRenderingContext2D; type: string },
    row: TraceRow<FuncStruct>
  ): void {
    let funcList = row.dataList;
    let funcFilter = row.dataListCache;
    func(
      funcList,
      funcFilter,
      TraceRow.range!.startNS,
      TraceRow.range!.endNS,
      TraceRow.range!.totalNS,
      row.frame,
      req.useCache || !TraceRow.range!.refresh,
      row.funcExpand
    );
    drawLoadingFrame(req.context, funcFilter, row, true);
    req.context.beginPath();
    let funcFind = false;
    for (let re of funcFilter) {
      FuncStruct.draw(req.context, re);
      if (row.isHover) {
        if (re.dur === 0 || re.dur === null || re.dur === undefined) {
          if (
            re.frame &&
            re.itid &&
            row.hoverX >= re.frame.x - 5 &&
            row.hoverX <= re.frame.x + 5 &&
            row.hoverY >= re.frame.y &&
            row.hoverY <= re.frame.y + re.frame.height
          ) {
            FuncStruct.hoverFuncStruct = re;
            funcFind = true;
          }
        } else {
          if (re.frame && re.itid && isFrameContainPoint(re.frame, row.hoverX, row.hoverY)) {
            FuncStruct.hoverFuncStruct = re;
            funcFind = true;
          }
        }
      }
    }
    if (!funcFind && row.isHover) {
      FuncStruct.hoverFuncStruct = undefined;
    }
    req.context.closePath();
  }
  render(req: RequestMessage, list: Array<FuncStruct>, filter: Array<FuncStruct>): void { }
}
export function func(
  funcList: Array<FuncStruct>,
  funcFilter: Array<FuncStruct>,
  startNS: number,
  endNS: number,
  totalNS: number,
  frame: Rect,
  use: boolean,
  expand: boolean
): void {
  if (use && funcFilter.length > 0) {
    for (let i = 0, len = funcFilter.length; i < len; i++) {
      if ((funcFilter[i].startTs || 0) + (funcFilter[i].dur || 0) >= startNS && (funcFilter[i].startTs || 0) <= endNS) {
        FuncStruct.setFuncFrame(funcFilter[i], 0, startNS, endNS, totalNS, frame);
      } else {
        funcFilter[i].frame = undefined;
      }
    }
    return;
  }
  funcFilter.length = 0;
  if (funcList) {
    let groups = funcList
      .filter(
        (it) =>
          (it.startTs ?? 0) + (it.dur ?? 0) >= startNS &&
          (it.startTs ?? 0) <= endNS &&
          ((!expand && it.depth === 0) || expand)
      )
      .map((it) => {
        FuncStruct.setFuncFrame(it, 0, startNS, endNS, totalNS, frame);
        return it;
      })
      .reduce((pre, current, index, arr) => {
        //@ts-ignore
        (pre[`${current.frame.x}-${current.depth}`] = pre[`${current.frame.x}-${current.depth}`] || []).push(current);
        return pre;
      }, {});
    Reflect.ownKeys(groups).map((kv) => {
      //@ts-ignore
      let arr = groups[kv].sort((a: FuncStruct, b: FuncStruct) => b.dur - a.dur);
      funcFilter.push(arr[0]);
    });
  }
}
export function funcStructOnClick(
  clickRowType: string,
  sp: SpSystemTrace,
  row: TraceRow<FuncStruct> | undefined,
  scrollToFuncHandler: Function,
  entry?: FuncStruct
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    if (clickRowType === TraceRow.ROW_TYPE_FUNC && (FuncStruct.hoverFuncStruct || entry)) {
      if (FuncStruct.funcSelect) {
        TabPaneTaskFrames.TaskArray = [];
        sp.removeLinkLinesByBusinessType('task');
        FuncStruct.firstSelectFuncStruct = FuncStruct.selectFuncStruct;
        let hoverFuncStruct = entry || FuncStruct.hoverFuncStruct;
        FuncStruct.selectFuncStruct = hoverFuncStruct;
        sp.timerShaftEL?.drawTriangle(FuncStruct.selectFuncStruct!.startTs || 0, 'inverted');
        let flagConfig = FlagsConfig.getFlagsConfig('TaskPool');
        let showTabArray: Array<string> = ['current-selection'];
        if (flagConfig!.TaskPool === 'Enabled') {
          if (FuncStruct.selectFuncStruct?.funName) {
            if (FuncStruct.selectFuncStruct.funName.indexOf('H:Task ') >= 0) {
              showTabArray.push('box-task-frames');
              sp.drawTaskPollLine(row);
            }
          }
        }
        sp.timerShaftEL?.drawTriangle(hoverFuncStruct!.ts || 0, 'inverted');
        sp.traceSheetEL?.displayFuncData(
          showTabArray,
          FuncStruct.selectFuncStruct!,
          scrollToFuncHandler,
          (datas: any, str: string, binderTid: number) => {
            sp.removeLinkLinesByBusinessType('func');
            if (str === 'binder-to') {
              datas.forEach((data: { tid: any; pid: any }) => {
                //@ts-ignore
                let endParentRow = sp.shadowRoot?.querySelector<TraceRow<unknown>>(
                  `trace-row[row-id='${data.pid}'][folder]`
                );
                sp.drawFuncLine(endParentRow, hoverFuncStruct, data, binderTid);
              });
            }
          }
        );
        sp.refreshCanvas(true);
        sp.timerShaftEL?.modifyFlagList(undefined);
      }
      reject(new Error());
    } else {
      resolve(null);
    }
  });
}
export class FuncStruct extends BaseFuncStruct {
  static hoverFuncStruct: FuncStruct | undefined;
  static selectFuncStruct: FuncStruct | undefined;
  static selectLineFuncStruct: Array<FuncStruct> = [];
  static firstSelectFuncStruct: FuncStruct | undefined;
  flag: string | undefined; // 570000
  textMetricsWidth: number | undefined;
  static funcSelect: boolean = true;
  pid: number = 0;
  static setFuncFrame(
    funcNode: FuncStruct,
    padding: number,
    startNS: number,
    endNS: number,
    totalNS: number,
    frame: Rect
  ): void {
    let x1: number;
    let x2: number;
    if ((funcNode.startTs || 0) > startNS && (funcNode.startTs || 0) <= endNS) {
      x1 = ns2x(funcNode.startTs || 0, startNS, endNS, totalNS, frame);
    } else {
      x1 = 0;
    }
    if (
      (funcNode.startTs || 0) + (funcNode.dur || 0) > startNS &&
      (funcNode.startTs || 0) + (funcNode.dur || 0) <= endNS
    ) {
      x2 = ns2x((funcNode.startTs || 0) + (funcNode.dur || 0), startNS, endNS, totalNS, frame);
    } else {
      x2 = frame.width;
    }
    if (!funcNode.frame) {
      funcNode.frame = new Rect(0, 0, 0, 0);
    }
    let getV: number = x2 - x1 < 1 ? 1 : x2 - x1;
    funcNode.frame.x = Math.floor(x1);
    funcNode.frame.y = funcNode.depth! * 18 + 3;
    funcNode.frame.width = Math.ceil(getV);
    funcNode.frame.height = 18;
  }
  static draw(ctx: CanvasRenderingContext2D, data: FuncStruct): void {
    if (data.frame) {
      let isBinder = FuncStruct.isBinder(data);
      if (data.dur === undefined || data.dur === null) {
      } else {
        ctx.globalAlpha = 1;
        if (data.callid && data.threadName) {
          if (data.funName!.startsWith('XStream')) {
            ctx.fillStyle = '#7a8c22';
          } else if (data.funName!.startsWith('WU-')) {
            ctx.fillStyle = '#349199';
          } else {
            ctx.fillStyle = ColorUtils.FUNC_COLOR[ColorUtils.hashFunc(data.funName || '', 0, ColorUtils.FUNC_COLOR.length)];
          }
        } else {
          ctx.fillStyle = ColorUtils.FUNC_COLOR[ColorUtils.hashFunc(data.funName || '', 0, ColorUtils.FUNC_COLOR.length)];
        }
        let textColor = ColorUtils.FUNC_COLOR[ColorUtils.hashFunc(data.funName || '', 0, ColorUtils.FUNC_COLOR.length)];
        if (FuncStruct.hoverFuncStruct && data.funName === FuncStruct.hoverFuncStruct.funName) {
          ctx.globalAlpha = 0.7;
        }
        ctx.fillRect(data.frame.x, data.frame.y, data.frame.width, data.frame.height);
        if (data.frame.width > 10) {
          if (data.callid && data.threadName) {
            if (data.funName!.startsWith('XStream') || data.funName!.startsWith('WU-')) {
              ctx.fillStyle = '#fff';
            } else {
              ctx.fillStyle = ColorUtils.funcTextColor(textColor);
            }
          } else {
            ctx.fillStyle = ColorUtils.funcTextColor(textColor);
          }
          ctx.textBaseline = 'middle';
          drawFunString(ctx, `${data.funName || ''}`, 5, data.frame, data);
        }
        if (
          data.callid === FuncStruct.selectFuncStruct?.callid &&
          data.startTs === FuncStruct.selectFuncStruct?.startTs &&
          data.depth === FuncStruct.selectFuncStruct?.depth
        ) {
          ctx.strokeStyle = '#000';
          ctx.lineWidth = 2;
          ctx.strokeRect(data.frame.x, data.frame.y + 1, data.frame.width, data.frame.height - 2);
        }
        let flagConfig = FlagsConfig.getFlagsConfig('TaskPool');
        if (
          flagConfig!.TaskPool === 'Enabled' &&
          data.funName!.indexOf('H:Task PerformTask End:') >= 0 &&
          data.funName!.indexOf('Successful') < 0
        ) {
          if (data.frame!.width < 10) {
            FuncStruct.drawTaskPoolUnSuccessFlag(ctx, data.frame!.x, (data.depth! + 0.5) * 18, 3, data!);
          } else {
            FuncStruct.drawTaskPoolUnSuccessFlag(ctx, data.frame!.x, (data.depth! + 0.5) * 18, 6, data!);
          }
        }
        if (flagConfig!.TaskPool === 'Enabled' && data.funName!.indexOf('H:Thread Timeout Exit') >= 0) {
          FuncStruct.drawTaskPoolTimeOutFlag(ctx, data.frame!.x, (data.depth! + 0.5) * 18, 10, data!);
        }
        if (data.nofinish && data.frame!.width > 4) {
          FuncStruct.drawRupture(ctx, data.frame.x, data.frame.y, data.frame.width, data.frame.height);
        }
      }
    }
  }
  static drawRupture(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
    ctx.fillStyle = '#fff'; 
    let ruptureWidth = 5;
    let ruptureNode = height / ruptureWidth;
    let len = height / ruptureNode;
    ctx.moveTo(x + width - 1, y);
    for (let i = 1; i <= ruptureNode; i++) {
      ctx.lineTo(x + width - 1 - (i % 2 === 0 ? 0 : ruptureWidth), y + len * i - 2);
    }
    ctx.closePath();
    ctx.fill();
  }
  static drawTaskPoolUnSuccessFlag(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    data: FuncStruct
  ): void {
    ctx.strokeStyle = '#FFC880';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(x + data.frame!.width, y, radius, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fillStyle = '#E64566';
    ctx.fill();
    ctx.stroke();
  }
  static drawTaskPoolTimeOutFlag(
    canvas: CanvasRenderingContext2D,
    x: number,
    y: number,
    radius: number,
    data: FuncStruct
  ): void {
    canvas.strokeStyle = '#FFC880';
    canvas.lineWidth = 1;
    canvas.beginPath();
    canvas.arc(x + data.frame!.width + 20, y, radius, 0, Math.PI * 2);
    canvas.closePath();
    canvas.fillStyle = '#FFC880';
    canvas.fill();
    canvas.stroke();
    canvas.font = '18px Arial';
    canvas.fillStyle = ColorUtils.GREY_COLOR;
    canvas.textAlign = 'center';
    canvas.fillText('¡', x + data.frame!.width + 20, y);
  }
  static isSelected(data: FuncStruct): boolean {
    return (
      FuncStruct.selectFuncStruct !== undefined &&
      FuncStruct.selectFuncStruct.startTs === data.startTs &&
      FuncStruct.selectFuncStruct.depth === data.depth
    );
  }
}
async initPreprocessData(progress: Function): Promise<void> {
  progress('load data dict', 50);
  this.process2 = undefined;
  SpSystemTrace.DATA_DICT.clear();
  SpChartManager.APP_STARTUP_PID_ARR = [];
  let dict = await queryDataDICT();
  if (FlagsConfig.getFlagsConfigEnableStatus('AppStartup')) {
    let appStartUpPids = await queryAppStartupProcessIds();
    appStartUpPids.forEach((it) => SpChartManager.APP_STARTUP_PID_ARR.push(it.pid));
  }
  await this.initTraceConfig(); 
  dict.map((d) => SpSystemTrace.DATA_DICT.set(d['id'], d['data']));
  await this.cacheDataDictToWorker();
  SpSystemTrace.DATA_TASK_POOL_CALLSTACK.clear();
  let taskPoolCallStack = await queryTaskPoolCallStack();
  taskPoolCallStack.map((d) => SpSystemTrace.DATA_TASK_POOL_CALLSTACK.set(d.id, d));
  progress('time range', 65);
  await this.initTotalTime();
  let ptArr = await queryThreadAndProcessName(); 
  this.handleProcessThread(ptArr);
  info('initData timerShaftEL Data initialized');
}
async initCpu(progress: Function): Promise<void> {
  progress('cpu', 70);
  let count = await sliceSender(); 
  await this.cpu.init(count.cpu);
  info('initData cpu Data initialized');
  if (FlagsConfig.getFlagsConfigEnableStatus('Bpftrace')) {
    await this.spBpftraceChart.init(null);
  }
  if (FlagsConfig.getFlagsConfigEnableStatus('GpuCounter')) {
    await this.spGpuCounterChart.init([]);
  }
  if (FlagsConfig.getFlagsConfigEnableStatus('SchedulingAnalysis')) {
    await this.cpu.initCpuIdle0Data(progress);
    await this.cpu.initSchedulingPTData(progress);
    await this.cpu.initSchedulingFreqData(progress);
  }
  info('initData ProcessThreadState Data initialized');
  progress('cpu rate', 75);
  await this.initCpuRate();
  info('initData Cpu Rate Data initialized');
  progress('cpu freq', 80);
  await this.freq.init();
  info('initData Cpu Freq Data initialized');
}
async initDistributedChart(progress: Function, file1: string, file2: string): Promise<void> {
  progress('load data dict', 50);
  SpSystemTrace.DATA_DICT.clear();
  SpChartManager.APP_STARTUP_PID_ARR = [];
  SpSystemTrace.DATA_TASK_POOL_CALLSTACK.clear();
  this.process.clearCache();
  this.process2?.clearCache();
  let trace1Folder = this.createFolderRow('trace-1', 'trace-1', file1);
  let trace2Folder = this.createFolderRow('trace-2', 'trace-2', file2);
  this.trace.rowsEL!.appendChild(trace1Folder);
  this.trace.rowsEL!.appendChild(trace2Folder);
  await this.initTotalTime(true);
  await this.initDistributedTraceRow('1', trace1Folder, progress);
  info(`trace 1 load completed`);
  await this.initDistributedTraceRow('2', trace2Folder, progress);
  info(`trace 2 load completed`);
}
async initDistributedTraceRow(traceId: string, traceFolder: TraceRow<any>, progress: Function): Promise<void> {
  let ptArr = await queryThreadAndProcessName(traceId);
  this.handleProcessThread(ptArr, traceId);
  info(`initData trace ${traceId} timerShaftEL Data initialized`);
  progress(`trace ${traceId} cpu`, 70);
  let count = await sliceSender(traceId);
  await this.cpu.init(count.cpu, traceFolder, traceId);
  info(`initData trace ${traceId} cpu Data initialized`);
  progress(`trace ${traceId} process`, 92);
  if (traceId === '2') {
    if (!this.process2) {
      this.process2 = new SpProcessChart(this.trace);
    }
    await this.process2.initAsyncFuncData(
      {
        startTs: Utils.getInstance().getRecordStartNS('2'),
        endTs: Utils.getInstance().getRecordEndNS('2'),
      },
      traceId
    );
    await this.process2.init(true, traceFolder, traceId);
  } else {
    await this.process.initAsyncFuncData(
      {
        startTs: Utils.getInstance().getRecordStartNS('1'),
        endTs: Utils.getInstance().getRecordEndNS('1'),
      },
      traceId
    );
    await this.process.init(true, traceFolder, traceId);
  }
}
initTotalTime = async (isDistributed: boolean = false): Promise<void> => {
  let res1 = await queryTotalTime('1');
  let total = res1[0].total;
  Utils.getInstance().trace1RecordStartNS = res1[0].recordStartNS;
  Utils.getInstance().trace1RecordEndNS = Math.max(res1[0].recordEndNS, res1[0].recordStartNS + 1);
  if (isDistributed) {
    let res2 = await queryTotalTime('2');
    total = Math.max(total, res2[0].total);
    Utils.getInstance().trace2RecordStartNS = res2[0].recordStartNS;
    Utils.getInstance().trace2RecordEndNS = Math.max(res2[0].recordEndNS, res2[0].recordStartNS + 1);
  }
  if (this.trace.timerShaftEL) {
    if (total === 0) {
      total = 1;
    }
    Utils.getInstance().totalNS = total;
    this.trace.timerShaftEL.totalNS = total;
    this.trace.timerShaftEL.getRangeRuler()!.drawMark = true;
    this.trace.timerShaftEL.setRangeNS(0, total);
    window.recordStartNS = Utils.getInstance().trace1RecordStartNS;
    window.recordEndNS = Utils.getInstance().trace1RecordEndNS;
    window.totalNS = total;
    this.trace.timerShaftEL.loadComplete = true;
  }
};
initSampleTime = async (ev: File, type: string): Promise<unknown> => {
  let res;
  let endNS = 30_000_000_000;
  if (type === 'gpucounter') {
    res = await this.spGpuCounterChart.getCsvData(ev);
    const endTime = Number(res[res.length - 1].split(',')[0]);
    const minIndex = this.spGpuCounterChart.getMinData(res) + 1;
    const startTime = Number(res[minIndex].split(',')[0]);
    endNS = Number((endTime - startTime).toString().slice(0, 11));
  }
  if (this.trace.timerShaftEL) {
    let total = endNS;
    let startNS = 0;
    this.trace.timerShaftEL.totalNS = total;
    this.trace.timerShaftEL.getRangeRuler()!.drawMark = true;
    this.trace.timerShaftEL.setRangeNS(0, total); 
    (window as unknown).recordStartNS = startNS; 
    (window as unknown).recordEndNS = endNS;
    (window as unknown).totalNS = total;
    this.trace.timerShaftEL.loadComplete = true;
  }
  return res;
}
private cpuSupplierFrame(traceRow: TraceRow<CpuStruct>, cpuId: number): void {
  traceRow.supplierFrame = async (): Promise<CpuStruct[]> => {
    const res = await cpuDataSender(cpuId, traceRow);
    const filterList = SpSystemTrace.keyPathList.filter((item) => {
      return item.cpu === cpuId;
    });
    res.push(...filterList);
    res.forEach((it, i, arr) => {
      let p = Utils.getInstance().getProcessMap().get(it.processId!);
      let t = Utils.getInstance().getThreadMap().get(it.tid!);
      let slice = Utils.getInstance().getSchedSliceMap().get(`${it.id}-${it.startTime}`);
      if (slice) {
        it.end_state = slice.endState;
        it.priority = slice.priority;
      }
      it.processName = p;
      it.processCmdLine = p;
      it.name = t;
      it.type = 'thread';
    });
    return res;
  };
}
private cpuThreadHandler(traceRow: TraceRow<CpuStruct>, i1: number): void {
  traceRow.onThreadHandler = (useCache: boolean, buf: ArrayBuffer | undefined | null): void => {
    let context: CanvasRenderingContext2D;
    if (traceRow.currentContext) {
      context = traceRow.currentContext;
    } else {
      context = traceRow.collect ? this.trace.canvasFavoritePanelCtx! : this.trace.canvasPanelCtx!;
    }
    traceRow.canvasSave(context);
    (renders['cpu-data'] as CpuRender).renderMainThread(
      {
        ctx: context,
        useCache: useCache,
        type: `cpu-data-${i1}`,
        translateY: traceRow.translateY,
      },
      traceRow
    );
    traceRow.canvasRestore(context, this.trace);
  };
}
async init(cpuDataCount?: Map<number, number>, parentRow?: TraceRow<any>, traceId?: string): Promise<void> {
  let CpuStartTime = new Date().getTime();
  let array = await queryCpuMax(traceId);
  let cpuCountResult = await queryCpuCount(traceId);
  if (cpuCountResult && cpuCountResult.length > 0 && cpuCountResult[0]) {
    Utils.getInstance().setWinCpuCount(cpuCountResult[0].cpuCount, traceId);
  } else {
    Utils.getInstance().setWinCpuCount(0, traceId);
  }
  let cpuSchedSlice = await queryCpuSchedSlice(traceId);
  this.initSchedSliceData(cpuSchedSlice, traceId);
  info('Cpu trace row data size is: ', array.length);
  if (array && array.length > 0 && array[0]) {
    let cpuMax = array[0].cpu + 1;
    Utils.getInstance().setCpuCount(cpuMax, traceId);
    for (let i1 = 0; i1 < cpuMax; i1++) {
      if (cpuDataCount && (cpuDataCount.get(i1) || 0) > 0) {
        let traceRow = this.createCpuRow(i1, traceId);
        if (parentRow) {
          parentRow.addChildTraceRow(traceRow);
        } else {
          this.trace.rowsEL?.appendChild(traceRow);
        }
      }
    }
  }
  let CpuDurTime = new Date().getTime() - CpuStartTime;
  info('The time to load the Cpu data is: ', CpuDurTime);
}
createCpuRow(cpuId: number, traceId?: string): TraceRow<CpuStruct> {
  let traceRow = TraceRow.skeleton<CpuStruct>(traceId);
  traceRow.rowId = `${cpuId}`;
  traceRow.rowType = TraceRow.ROW_TYPE_CPU;
  traceRow.rowParentId = '';
  traceRow.style.height = '30px';
  traceRow.name = `Cpu ${cpuId}`;
  traceRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
  traceRow.selectChangeHandler = this.trace.selectChangeHandler;
  traceRow.supplierFrame = async (): Promise<CpuStruct[]> => {
    let res = await cpuDataSender(cpuId, traceRow, traceId);
    const filterList = SpSystemTrace.keyPathList.filter((item): boolean => {
      return item.cpu === cpuId;
    });
    res.push(...filterList);
    res.forEach((it, i, arr): void => {
      let p = Utils.getInstance().getProcessMap(traceId).get(it.processId!);
      let t = Utils.getInstance().getThreadMap(traceId).get(it.tid!);
      let slice = Utils.getInstance().getSchedSliceMap(traceId).get(`${it.id}-${it.startTime}`);
      if (slice) {
        it.end_state = slice.endState;
        it.priority = slice.priority;
      }
      it.processName = p;
      it.processCmdLine = p;
      it.name = t;
      it.type = 'thread';
    });
    return res;
  };
  traceRow.focusHandler = (): void => {
    this.trace?.displayTip(
      traceRow,
      CpuStruct.hoverCpuStruct,
      `<span>P：${CpuStruct.hoverCpuStruct?.processName || 'Process'} [${
        CpuStruct.hoverCpuStruct?.processId
      }]</span><span>T：${CpuStruct.hoverCpuStruct?.name} [${CpuStruct.hoverCpuStruct?.tid}] [Prio:${
        CpuStruct.hoverCpuStruct?.priority || 0
      }]</span>`
    );
  };
  traceRow.findHoverStruct = (): void => {
    CpuStruct.hoverCpuStruct = traceRow.getHoverStruct();
  };
  traceRow.onThreadHandler = rowThreadHandler<CpuRender>('cpu-data', 'ctx', {
    type: `cpu-data-${cpuId}`,
    translateY: traceRow.translateY,
  }, traceRow, this.trace);
  return traceRow;
}