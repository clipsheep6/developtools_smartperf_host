export class SpProcessChart {
  initAsyncFuncData = async (): Promise<void> => {
    let asyncFuncList: any[] = await queryProcessAsyncFunc();
    info('AsyncFuncData Count is: ', asyncFuncList!.length);
    this.processAsyncFuncArray = asyncFuncList;
    this.processAsyncFuncMap = Utils.groupBy(asyncFuncList, 'pid');

    let asyncFuncCatList: any[] = await queryProcessAsyncFuncCat();
    info('AsyncFuncCatData Count is: ', asyncFuncCatList!.length);
    this.processAsyncFuncCatArray = asyncFuncCatList;
    this.processAsyncFuncCatMap = Utils.groupBy(asyncFuncCatList, 'pid');
  };
  initTouchEventDispatch = async (): Promise<void> => {
    let row = TraceRow.skeleton();
    row.setAttribute('disabled-check', '');
    row.rowId = 'TouchEventDispatch';
    row.index = 0;
    row.rowType = TraceRow.ROW_TYPE_TOUCH_EVENT_DISPATCH;
    row.rowParentId = '';
    row.folder = true;
    row.style.height = '40px';
    row.name = 'TouchEventDispatch';
    row.supplier = folderSupplier();
    row.onThreadHandler = folderThreadHandler(row, this.trace);
    let asyncFuncGroup = Utils.groupBy(
      this.processAsyncFuncArray.filter((it) => it.funName === 'H:touchEventDispatch'),
      'tid'
    );
    if (Reflect.ownKeys(asyncFuncGroup).length > 0) {
      this.trace.rowsEL?.appendChild(row);
    }
    Reflect.ownKeys(asyncFuncGroup).map((key: any) => {
      let asyncFuncGroups: Array<any> = asyncFuncGroup[key];
      if (asyncFuncGroups.length > 0) {
        row.addChildTraceRow(this.createTouchEventDispatchRow(row, key, asyncFuncGroups));
      }
    });
  };
  private createTouchEventDispatchRow(parentRow: TraceRow<any>, key: number, asyncFuncGroups: Array<any>): TraceRow<FuncStruct> {
    let funcRow = TraceRow.skeleton<FuncStruct>();
    funcRow.rowId = `${asyncFuncGroups[0].funName}-${key}`;
    funcRow.asyncFuncName = asyncFuncGroups[0].funName;
    funcRow.asyncFuncNamePID = key;
    funcRow.rowType = TraceRow.ROW_TYPE_FUNC;
    funcRow.enableCollapseChart();
    funcRow.rowParentId = `${parentRow.rowId}`;
    funcRow.rowHidden = !parentRow.expansion;
    funcRow.style.width = '100%';
    funcRow.style.height = '24px';
    funcRow.name = `${asyncFuncGroups[0].funName} ${key}`;
    funcRow.setAttribute('children', '');
    funcRow.supplierFrame = () => {
      return processTouchEventDispatchDataSender(key, funcRow!).then((res: Array<any>) => {
        this.touchEventDispatchSendCallback(res, funcRow, asyncFuncGroups);
        return res;
      });
    };
    funcRow.findHoverStruct = (): void => {
      FuncStruct.hoverFuncStruct = funcRow.getHoverStruct();
    }
    funcRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
    funcRow.selectChangeHandler = this.trace.selectChangeHandler;
    funcRow.onThreadHandler = rowThreadHandler<FuncRender>('func', 'context', {
      type: `func-${asyncFuncGroups[0].funName}-${key}`,
    }, funcRow, this.trace);
    return funcRow;
  }
  private touchEventDispatchSendCallback(res: Array<any>, funcRow: TraceRow<any>, asyncFuncGroups: Array<any>): void {
    let isIntersect = (left: any, right: any): boolean =>
      Math.max(left.startTs + left.dur, right.startTs + right.dur) - Math.min(left.startTs, right.startTs) <
      left.dur + right.dur;
    let depths: any = [];
    let createDepth = (currentDepth: number, index: number): void => {
      if (depths[currentDepth] == undefined || !isIntersect(depths[currentDepth], res[index])) {
        res[index].depth = currentDepth;
        depths[currentDepth] = res[index];
      } else {
        createDepth(++currentDepth, index);
      }
    };
    res.forEach((it, i) => {
      res[i].funName = this.funcNameMap.get(res[i].id!);
      res[i].threadName = Utils.THREAD_MAP.get(res[i].tid!);
      if (it.dur == -1 || it.dur === null || it.dur === undefined) {
        it.dur = (TraceRow.range?.endNS || 0) - it.startTs;
        it.flag = 'Did not end';
      }
      createDepth(0, i);
    });
    if (funcRow && !funcRow.isComplete) {
      let max = Math.max(...asyncFuncGroups.map((it) => it.depth || 0)) + 1;
      let maxHeight = max * 18 + 6;
      funcRow.style.height = `${maxHeight}px`;
      funcRow.setAttribute('height', `${maxHeight}`);
    }
  }
  addAsyncCatFunction(it: { pid: number; processName: string | null }, processRow: TraceRow<ProcessStruct>): void {
    let asyncFuncCatList = this.processAsyncFuncCatMap[it.pid] || [];
    let asyncFuncGroup = Utils.groupBy(asyncFuncCatList, 'threadName');
    Reflect.ownKeys(asyncFuncGroup).map((key: any) => {
      let asyncFunctions: Array<any> = asyncFuncGroup[key];
      if (asyncFunctions.length > 0) {
        let isIntersect = (a: any, b: any): boolean =>
          Math.max(a.startTs + a.dur, b.startTs + b.dur) - Math.min(a.startTs, b.startTs) < a.dur + b.dur;
        let depthArray: any = [];
        asyncFunctions.forEach((it, i) => {
          if (it.dur === -1 || it.dur === null || it.dur === undefined) {
            it.dur = (TraceRow.range?.endNS || 0) - it.startTs;
            it.flag = 'Did not end';
            it.nofinish = true;
          }
          let currentDepth = 0;
          let index = i;
          while (depthArray[currentDepth] !== undefined && isIntersect(depthArray[currentDepth], asyncFunctions[index])) {
            currentDepth++;
          }
          asyncFunctions[index].depth = currentDepth;
          depthArray[currentDepth] = asyncFunctions[index];
        });
        const maxHeight = this.calMaxHeight(asyncFunctions);
        let funcRow = TraceRow.skeleton<FuncStruct>();
        funcRow.rowId = `${asyncFunctions[0].threadName}`;
        funcRow.asyncFuncthreadName = asyncFunctions[0].threadName;
        funcRow.asyncFuncNamePID = it.pid;
        funcRow.rowType = TraceRow.ROW_TYPE_FUNC;
        funcRow.enableCollapseChart();
        funcRow.rowParentId = `${it.pid}`;
        funcRow.rowHidden = !processRow.expansion;
        funcRow.style.width = '100%';
        funcRow.style.height = `${maxHeight}px`;
        funcRow.setAttribute('height', `${maxHeight}`);
        funcRow.name = `${asyncFunctions[0].threadName}`;
        funcRow.setAttribute('children', '');
        funcRow.findHoverStruct = (): void => {
          FuncStruct.hoverFuncStruct = funcRow.getHoverStruct();
        }
        funcRow.supplier = (): Promise<any> => new Promise((resolve) => resolve(asyncFunctions));
        funcRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
        funcRow.selectChangeHandler = this.trace.selectChangeHandler;
        funcRow.onThreadHandler = rowThreadHandler<FuncRender>('func', 'context', {
          type: `func-${asyncFunctions[0].threadName}-${it.pid}`,
        }, funcRow, this.trace);
        processRow.addChildTraceRow(funcRow);
      }
    });
  }
  processChildRows.forEach((th) => {
  th.rangeSelect = true;
  th.checkType = '2';
  if (th.rowType == TraceRow.ROW_TYPE_THREAD) {
    this.threadIds.push(parseInt(th.rowId!));
  } else if (th.rowType == TraceRow.ROW_TYPE_FUNC) {
    if (th.asyncFuncName) {
      if (typeof th.asyncFuncName === 'string') {
        this.funAsync.push({
          name: th.asyncFuncName,
          pid: th.asyncFuncNamePID || 0
        });
      }
    } else if (th.asyncFuncthreadName) {
      if (typeof th.asyncFuncthreadName === 'string') {
        this.funCatAsync.push({
          pid: th.asyncFuncNamePID || 0,
          threadName: th.asyncFuncthreadName,
        });
      }
    } else {
      this.funTids.push(parseInt(th.rowId!));
    }
  } else if (th.rowType == TraceRow.ROW_TYPE_MEM) {
    this.processTrackIds.push(parseInt(th.rowId!));
  }
});
pushFunc(it: TraceRow<any>, sp: SpSystemTrace) {
  if (it.rowType == TraceRow.ROW_TYPE_FUNC) {
    TabPaneTaskFrames.TaskArray = [];
    sp.pushPidToSelection(this, it.rowParentId!);
    if (it.asyncFuncName) {
      if (typeof it.asyncFuncName === 'string') {
        this.funAsync.push({
          name: it.asyncFuncName,
          pid: it.asyncFuncNamePID || 0
        });
      } else {
        for (let i = 0; i < it.asyncFuncName.length; i++) {
          const el = it.asyncFuncName[i];
          this.funAsync.push({
            name: el,
            pid: it.asyncFuncNamePID || 0
          });
        }
      }
    } else if (it.asyncFuncthreadName) {
      if (typeof it.asyncFuncthreadName === 'string') {
        this.funCatAsync.push({
          pid: it.asyncFuncNamePID || 0,
          threadName: it.asyncFuncthreadName
        });
      } else {
        for (let i = 0; i < it.asyncFuncthreadName.length; i++) {
          const tn = it.asyncFuncthreadName[i];
          this.funCatAsync.push({
            pid: it.asyncFuncNamePID || 0,
            threadName: tn
          });
        }
      }
    } else {
      this.funTids.push(parseInt(it.rowId!));
    }
  }
}
}

initDeliverInputEvent = async (): Promise<void> => {
  let row = TraceRow.skeleton();
  row.setAttribute('disabled-check', '');
  row.rowId = 'DeliverInputEvent';
  row.index = 0;
  row.rowType = TraceRow.ROW_TYPE_DELIVER_INPUT_EVENT;
  row.rowParentId = '';
  row.folder = true;
  row.style.height = '40px';
  row.name = 'DeliverInputEvent';
  row.supplier = folderSupplier();
  row.onThreadHandler = folderThreadHandler(row, this.trace);

  let asyncFuncGroup = Utils.groupBy(
    this.processAsyncFuncArray.filter((it) => it.funName === 'deliverInputEvent'),
    'tid'
  );
  if (Reflect.ownKeys(asyncFuncGroup).length > 0) {
    this.trace.rowsEL?.appendChild(row);
  }
  Reflect.ownKeys(asyncFuncGroup).map((key: any) => {
    let asyncFuncGroups: Array<any> = asyncFuncGroup[key];
    if (asyncFuncGroups.length > 0) {
      row.addChildTraceRow(this.createDeliverInputEventRow(row, key, asyncFuncGroups));
    }
  });
};
private createDeliverInputEventRow(parentRow: TraceRow<any>, key: number, asyncFuncGroups: Array<any>): TraceRow<FuncStruct> {
  let funcRow = TraceRow.skeleton<FuncStruct>();
  funcRow.rowId = `${asyncFuncGroups[0].funName}-${key}`;
  funcRow.asyncFuncName = asyncFuncGroups[0].funName;
  funcRow.asyncFuncNamePID = key;
  funcRow.rowType = TraceRow.ROW_TYPE_FUNC;
  funcRow.enableCollapseChart(); //允许折叠泳道图
  funcRow.rowParentId = `${parentRow.rowId}`;
  funcRow.rowHidden = !parentRow.expansion;
  funcRow.style.width = '100%';
  funcRow.name = `${asyncFuncGroups[0].funName} ${key}`;
  funcRow.setAttribute('children', '');
  funcRow.supplierFrame = () => {
    return processDeliverInputEventDataSender(key, funcRow!).then((res: Array<any>) => {
      this.deliverInputEventSendCallback(res, funcRow, asyncFuncGroups);
      return res;
    });
  };
  funcRow.findHoverStruct = (): void => {
    FuncStruct.hoverFuncStruct = funcRow.getHoverStruct();
  }
  funcRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
  funcRow.selectChangeHandler = this.trace.selectChangeHandler;
  funcRow.onThreadHandler = rowThreadHandler<FuncRender>('func', 'context', {
    type: `func-${asyncFuncGroups[0].funName}-${key}`,
  }, funcRow, this.trace);
  return funcRow;
}
private deliverInputEventSendCallback(res: Array<any>, funcRow: TraceRow<any>, asyncFuncGroups: Array<any>): void {
  let isIntersect = (left: any, right: any): boolean =>
    Math.max(left.startTs + left.dur, right.startTs + right.dur) - Math.min(left.startTs, right.startTs) <
    left.dur + right.dur;
  let depths: any = [];
  let createDepth = (currentDepth: number, index: number): void => {
    if (depths[currentDepth] == undefined || !isIntersect(depths[currentDepth], res[index])) {
      res[index].depth = currentDepth;
      depths[currentDepth] = res[index];
    } else {
      createDepth(++currentDepth, index);
    }
  };
  res.forEach((it, i) => {
    res[i].funName = this.funcNameMap.get(res[i].id!);
    res[i].threadName = Utils.THREAD_MAP.get(res[i].tid!);
    if (it.dur == -1 || it.dur === null || it.dur === undefined) {
      it.dur = (TraceRow.range?.endNS || 0) - it.startTs;
      it.flag = 'Did not end';
    }
    createDepth(0, i);
  });
  if (funcRow && !funcRow.isComplete) {
    let max = Math.max(...asyncFuncGroups.map((it) => it.depth || 0)) + 1;
    let maxHeight = max * 18 + 6;
    funcRow.style.height = `${maxHeight}px`;
    funcRow.setAttribute('height', `${maxHeight}`);
  }
}
async init(): Promise<void> {
  await this.prepareData();
  if (
    this.eventCountMap['print'] == 0 &&
    this.eventCountMap['tracing_mark_write'] == 0 &&
    this.eventCountMap['sched_switch'] == 0
  ) {
    return;
  }
  let time = new Date().getTime();
  let processes = await queryProcess();
  let processFromTable = await queryProcessByTable();
  let processList = Utils.removeDuplicates(processes, processFromTable, 'pid');
  let allJankProcessData = await queryAllJankProcess();
  let allJankProcess: Array<number> = [];
  if (allJankProcessData.length > 0) {
    allJankProcessData.forEach((name, index) => {
      allJankProcess.push(name.pid!);
    });
  }
  let allTaskPoolPid: Array<{ pid: number }> = [];
  if (FlagsConfig.getFlagsConfigEnableStatus('TaskPool')) {
    allTaskPoolPid = await queryTaskPoolProcessIds();
  }
  let renderServiceProcess = await queryRsProcess();
  info('ProcessList Data size is: ', processList!.length);
  await this.initProcessRow(processList, allTaskPoolPid, allJankProcess, renderServiceProcess);
  let durTime = new Date().getTime() - time;
  info('The time to load the Process data is: ', durTime);
}

private async prepareData(): Promise<void> {
  let maxValues = await queryMemFilterIdMaxValue();
  maxValues.forEach((it) => {
    this.filterIdMaxValue.set(it.filterId, it.maxValue);
  });
  let funcNamesArray = await queryAllFuncNames();
  funcNamesArray.forEach((it) => {
    this.funcNameMap.set(it.id, it.name);
  });
  let soInitNamesArray = await queryAllSoInitNames();
  soInitNamesArray.forEach((it) => {
    this.soInitNameMap.set(it.id, it.name);
  });
  let processSrcSliceArray = await queryAllSrcSlices();
  processSrcSliceArray.forEach((it) => {
    this.processSrcSliceMap.set(it.id, it.src);
  });
  let threadFuncMaxDepthArray = await getMaxDepthByTid();
  info('Gets the maximum tier per thread , tid and maxDepth');
  threadFuncMaxDepthArray.forEach((it) => {
    this.threadFuncMaxDepthMap.set(`${it.ipid}-${it.tid}`, it.maxDepth);
  });
  info('convert tid and maxDepth array to map');
  let pidCountArray = await queryProcessContentCount();
  info('fetch per process  pid,switch_count,thread_count,slice_count,mem_count');
  pidCountArray.forEach((it) => {
    this.processThreadDataCountMap.set(it.pid, it.switch_count);
    this.processThreadCountMap.set(it.pid, it.thread_count);
    this.processFuncDataCountMap.set(it.pid, it.slice_count);
    this.processMemDataCountMap.set(it.pid, it.mem_count);
  });
  this.processMem = await queryProcessMem();
  info('The amount of initialized process memory data is : ', this.processMem!.length);
  this.loadAppStartup = FlagsConfig.getFlagsConfigEnableStatus('AppStartup');
  info('Prepare App startup data ');
  if (this.loadAppStartup) {
    this.startupProcessArr = await queryStartupPidArray();
    this.processSoMaxDepth = await queryProcessSoMaxDepth();
  }
  let eventCountList: Array<any> = await queryEventCountMap();
  this.eventCountMap = eventCountList.reduce((pre, current) => {
    pre[`${current.eventName}`] = current.count;
    return pre;
  }, {});
  let queryProcessThreadResult = await queryProcessThreads();
  let queryProcessThreadsByTableResult = await queryProcessThreadsByTable();
  this.processThreads = Utils.removeDuplicates(queryProcessThreadResult, queryProcessThreadsByTableResult, 'tid');
  info('The amount of initialized process threads data is : ', this.processThreads!.length);
}

private async initProcessRow(pArr: Array<any>, allTaskPoolPid: Array<{ pid: number }>, jankArr: Array<number>, rsProcess: Array<any>) {
  for (let i = 0; i < pArr.length; i++) {
    const it = pArr[i];
    if (
      (this.processThreadDataCountMap.get(it.pid) || 0) == 0 &&
      (this.processThreadCountMap.get(it.pid) || 0) == 0 &&
      (this.processFuncDataCountMap.get(it.pid) || 0) == 0 &&
      (this.processMemDataCountMap.get(it.pid) || 0) == 0
    ) {
      continue;
    }
    let processRow = this.createProcessRow(i, it, allTaskPoolPid);
    this.trace.rowsEL?.appendChild(processRow);
    /* App Startup row*/
    let startupRow: TraceRow<AppStartupStruct> | undefined = undefined;
    let soRow: TraceRow<SoStruct> | undefined = undefined;
    if (this.loadAppStartup) {
      if (this.startupProcessArr.find((sp) => sp.pid === it.pid)) {
        startupRow = this.addStartUpRow(processRow);
      }
      let maxSoDepth = this.processSoMaxDepth.find((md) => md.pid === it.pid);
      if (maxSoDepth) {
        soRow = this.addSoInitRow(processRow, maxSoDepth.maxDepth);
      }
    }

    let actualRow: TraceRow<JankStruct> | null = null;
    let expectedRow: TraceRow<JankStruct> | null = null;
    this.renderRow = null;
    if (it.processName === 'render_service') {
      this.addThreadList(it, processRow, expectedRow, actualRow, soRow, startupRow);
      this.addProcessMemInfo(it, processRow);
      if (jankArr.indexOf(it.pid!) > -1) {
        expectedRow = this.addExpectedRow(it, processRow, rsProcess);
        actualRow = this.addActualRow(it, processRow, rsProcess);
      }
      this.addProcessRowListener(processRow, actualRow);
      this.addAsyncFunction(it, processRow);
      this.addAsyncCatFunction(it, processRow);//xiugai
    } else {
      if (jankArr.indexOf(it.pid!) > -1) {
        expectedRow = this.addExpectedRow(it, processRow, rsProcess);
        actualRow = this.addActualRow(it, processRow, rsProcess);
      }
      this.addProcessRowListener(processRow, actualRow);
      this.addAsyncFunction(it, processRow);
      this.addProcessMemInfo(it, processRow);
      this.addThreadList(it, processRow, expectedRow, actualRow, soRow, startupRow);
      this.addAsyncCatFunction(it, processRow);//xiugai
    }

    await this.trace.chartManager?.frameTimeChart.initAnimatedScenesChart(processRow, it, expectedRow!, actualRow!);
  }
}
private createProcessRow(index: number, process: any, allTaskPoolPid: Array<{ pid: number }>) {
  let processRow = TraceRow.skeleton<ProcessStruct>();
  processRow.rowId = `${process.pid}`;
  processRow.index = index;
  processRow.rowType = TraceRow.ROW_TYPE_PROCESS;
  processRow.rowParentId = '';
  processRow.style.height = '40px';
  processRow.folder = true;
  if (
    SpChartManager.APP_STARTUP_PID_ARR.find((pid) => pid === process.pid) !== undefined ||
    process.processName === 'render_service'
  ) {
    processRow.addTemplateTypes('AppStartup');
  }
  if (allTaskPoolPid.find((process) => process.pid === process.pid) !== undefined) {
    processRow.addTemplateTypes('TaskPool');
  }
  processRow.name = `${process.processName || 'Process'} ${process.pid}`;
  processRow.supplierFrame = (): Promise<Array<any>> => {
    return processDataSender(process.pid || -1, processRow);
  };
  processRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
  processRow.selectChangeHandler = this.trace.selectChangeHandler;
  processRow.onThreadHandler = rowThreadHandler<ProcessRender>('process', 'context', {
    pid: process.pid,
    type: `process ${processRow.index} ${process.processName}`
  }, processRow, this.trace);
  return processRow;
}
addProcessRowListener(processRow: TraceRow<ProcessStruct>, actualRow: TraceRow<JankStruct> | null) {
  let offsetYTimeOut: any = undefined;
  processRow.addEventListener('expansion-change', (e: any) => {
    JankStruct.delJankLineFlag = false;
    if (offsetYTimeOut) {
      clearTimeout(offsetYTimeOut);
    }
    if (JankStruct.selectJankStruct !== null && JankStruct.selectJankStruct !== undefined) {
      if (e.detail.expansion) {
        offsetYTimeOut = setTimeout(() => {
          this.trace.linkNodes.forEach((linkNodeItem) => this.handler1(e, linkNodeItem, actualRow));
        }, 300);
      } else {
        if (JankStruct!.selectJankStruct) {
          JankStruct.selectJankStructList?.push(<JankStruct>JankStruct!.selectJankStruct);
        }
        offsetYTimeOut = setTimeout(() => {
          this.trace.linkNodes?.forEach((linkProcessItem) => this.handler2(e, linkProcessItem, processRow));
        }, 300);
      }
    } else {
      if (e.detail.expansion) {
        offsetYTimeOut = setTimeout(() => {
          this.trace.linkNodes.forEach((linkNodeItem) => this.handler3(e, linkNodeItem));
        }, 300);
      } else {
        if (ThreadStruct!.selectThreadStruct) {
          ThreadStruct.selectThreadStructList?.push(<ThreadStruct>ThreadStruct!.selectThreadStruct);
        }
        offsetYTimeOut = setTimeout(() => {
          this.trace.linkNodes?.forEach((linkProcessItem) => {
            this.handler4(e, linkProcessItem, processRow);
            JankStruct.selectJankStructList = [];
          });
        }, 300);
      }
    }
    let refreshTimeOut = setTimeout(() => {
      this.trace.refreshCanvas(true);
      clearTimeout(refreshTimeOut);
    }, 360);
  });
}
handler1(e: any, linkItem: PairPoint[], actualRow: TraceRow<JankStruct> | null) {
  JankStruct.selectJankStructList?.forEach((selectProcessStruct: any) => {
    if (e.detail.rowId == selectProcessStruct.pid) {
      JankStruct.selectJankStruct = selectProcessStruct;
      JankStruct.hoverJankStruct = selectProcessStruct;
    }
  });
  this.updatePairPointTranslateY(linkItem[0]);
  linkItem[0].y = linkItem[0].rowEL!.translateY! + linkItem[0].offsetY;
  this.updatePairPointTranslateY(linkItem[1]);
  linkItem[1].y = linkItem[1].rowEL!.translateY! + linkItem[1].offsetY;
  if (actualRow) {
    if (linkItem[0].rowEL.rowId == e.detail.rowId) {
      linkItem[0].x = ns2xByTimeShaft(linkItem[0].ns, this.trace.timerShaftEL!);
      linkItem[0].y = actualRow!.translateY! + linkItem[0].offsetY * 2;
      linkItem[0].offsetY = linkItem[0].offsetY * 2;
      linkItem[0].rowEL = actualRow!;
    } else if (linkItem[1].rowEL.rowId == e.detail.rowId) {
      linkItem[1].x = ns2xByTimeShaft(linkItem[1].ns, this.trace.timerShaftEL!);
      linkItem[1].y = actualRow!.translateY! + linkItem[1].offsetY * 2;
      linkItem[1].offsetY = linkItem[1].offsetY * 2;
      linkItem[1].rowEL = actualRow!;
    }
  }
}
handler2(e: any, linkItem: PairPoint[], processRow: TraceRow<ProcessStruct>) {
  this.updatePairPointTranslateY(linkItem[0]);
  linkItem[0].y = linkItem[0].rowEL!.translateY! + linkItem[0].offsetY;
  this.updatePairPointTranslateY(linkItem[1]);
  linkItem[1].y = linkItem[1].rowEL!.translateY! + linkItem[1].offsetY;
  if (linkItem[0].rowEL.rowParentId == e.detail.rowId) {
    this.updatePairPoint(linkItem[0], processRow);
  } else if (linkItem[1].rowEL.rowParentId == e.detail.rowId) {
    this.updatePairPoint(linkItem[1], processRow);
  }
}
handler3(e: any, linkItem: PairPoint[]) {
  ThreadStruct.selectThreadStructList?.forEach((selectProcessStruct: any) => {
    if (e.detail.rowId == selectProcessStruct.pid) {
      ThreadStruct.selectThreadStruct = selectProcessStruct;
      ThreadStruct.hoverThreadStruct = selectProcessStruct;
    }
  });
  if (linkItem[0].rowEL.expansion && linkItem[0].backrowEL) {
    this.updatePairPointTranslateY(linkItem[0]);
    linkItem[0].x = ns2xByTimeShaft(linkItem[0].ns, this.trace.timerShaftEL!);
    linkItem[0].y = linkItem[0].rowEL.translateY + linkItem[0].offsetY;
    linkItem[0].offsetY = linkItem[0].offsetY * 2;
    linkItem[0].rowEL = linkItem[0].backrowEL;
  }
  if (linkItem[1].rowEL.expansion && linkItem[1].backrowEL) {
    this.updatePairPointTranslateY(linkItem[1]);
    linkItem[1].x = ns2xByTimeShaft(linkItem[1].ns, this.trace.timerShaftEL!);
    linkItem[1].y = linkItem[1].rowEL!.translateY! + linkItem[1].offsetY;
    linkItem[1].offsetY = linkItem[1].offsetY * 2;
    linkItem[1].rowEL = linkItem[1].backrowEL;
  }
}
handler4(e: any, linkItem: PairPoint[], processRow: TraceRow<ProcessStruct>) {
  this.updatePairPointTranslateY(linkItem[0]);
  linkItem[0].y = processRow!.translateY + linkItem[0].offsetY;
  this.updatePairPointTranslateY(linkItem[1]);
  linkItem[1].y = linkItem[1].rowEL!.translateY + linkItem[1].offsetY;
  if (linkItem[0].rowEL.rowParentId == e.detail.rowId) {
    this.updatePairPoint(linkItem[0], processRow);
  }
  if (linkItem[1].rowEL.rowParentId == e.detail.rowId) {
    this.updatePairPoint(linkItem[1], processRow);
  }
}
updatePairPointTranslateY(pair: PairPoint) {
  if (pair.rowEL.collect) {
    pair.rowEL.translateY = pair.rowEL.getBoundingClientRect().top - 195;
  } else {
    pair.rowEL.translateY = pair.rowEL.offsetTop - this.trace.rowsPaneEL!.scrollTop;
  }
}
updatePairPoint(pair: PairPoint, processRow: TraceRow<ProcessStruct>) {
  if (!pair.rowEL.collect) {
    pair.x = ns2xByTimeShaft(pair.ns, this.trace.timerShaftEL!);
    pair.y = processRow!.translateY! + pair.offsetY / 2;
    pair.offsetY = pair.offsetY / 2;
    pair.rowEL = processRow!;
  }
}
addExpectedRow(
  process: any,
  processRow: TraceRow<any>,
  renderServiceProcess: Array<any>
): TraceRow<JankStruct> {
  let expectedRow = TraceRow.skeleton<JankStruct>();
  expectedRow.asyncFuncName = process.processName;
  expectedRow.asyncFuncNamePID = process.pid;
  expectedRow.rowType = TraceRow.ROW_TYPE_JANK;
  expectedRow.rowParentId = `${process.pid}`;
  expectedRow.rowHidden = !processRow.expansion;
  expectedRow.style.width = '100%';
  expectedRow.name = 'Expected Timeline';
  expectedRow.addTemplateTypes('FrameTimeline');
  expectedRow.setAttribute('children', '');
  expectedRow.supplierFrame = async () => {
    let res = await processExpectedDataSender(process.pid, expectedRow!);
    this.jankSenderCallback(res, 'expected', process, expectedRow, renderServiceProcess);
    return res;
  };
  expectedRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
  expectedRow.selectChangeHandler = this.trace.selectChangeHandler;
  expectedRow.onThreadHandler = rowThreadHandler<JankRender>('jank', 'context', {
    type: 'expected_frame_timeline_slice',
  }, expectedRow, this.trace);
  if (this.renderRow) {
    processRow.addChildTraceRowBefore(expectedRow, this.renderRow);
  } else {
    processRow.addChildTraceRow(expectedRow);
  }
  return expectedRow;
}
addActualRow(
  process: any,
  processRow: TraceRow<any>,
  renderServiceProcess: Array<any>
): TraceRow<JankStruct> {
  let actualRow = TraceRow.skeleton<JankStruct>();
  actualRow.rowType = TraceRow.ROW_TYPE_JANK;
  actualRow.rowParentId = `${process.pid}`;
  actualRow.rowHidden = !processRow.expansion;
  actualRow.style.width = '100%';
  actualRow.name = 'Actual Timeline';
  actualRow.addTemplateTypes('FrameTimeline');
  actualRow.setAttribute('children', '');
  actualRow.supplierFrame = async () => {
    let res = await processActualDataSender(process.pid, actualRow!);
    this.jankSenderCallback(res, 'actual', process, actualRow, renderServiceProcess);
    return res;
  };
  actualRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
  actualRow.selectChangeHandler = this.trace.selectChangeHandler;
  actualRow.onThreadHandler = rowThreadHandler<JankRender>('jank', 'context', {
    type: 'actual_frame_timeline_slice',
  }, actualRow, this.trace);
  if (this.renderRow) {
    processRow.addChildTraceRowBefore(actualRow, this.renderRow);
  } else {
    processRow.addChildTraceRow(actualRow);
  }
  return actualRow;
}
jankSenderCallback(res: JankStruct[], type: string, process: any, row: TraceRow<JankStruct>, renderServiceProcess: Array<any>) {
  let maxDepth: number = 1;
  let unitHeight: number = 20;
  for (let j = 0; j < res.length; j++) {
    let struct = res[j];
    if (struct.depth! >= maxDepth) {
      maxDepth = struct.depth! + 1;
    }
    if (type === 'actual') {
      struct.src_slice = this.processSrcSliceMap.get(res[j].id!);
    }
    struct.cmdline = Utils.PROCESS_MAP.get(res[j].pid!);
    if (res[j].pid! === renderServiceProcess[0].pid) {
      struct.cmdline = 'render_service';
      struct.frame_type = struct.cmdline;
    } else {
      struct.frame_type = 'app';
    }
  }
  if (row && !row.isComplete && res.length > 0) {
    let maxHeight: number = maxDepth * unitHeight;
    row.style.height = `${maxHeight}px`;
    row.setAttribute('height', `${maxHeight}`);
    if (res[0]) {
      let timeLineType = res[0].type;
      row.rowId = `${timeLineType}-${process.pid}`;
      row.setAttribute('frame_type', res[0].frame_type || '');
      if (type === 'actual') {
        row.dataList = res;
      }
    }
  }
}
addStartUpRow(processRow: TraceRow<ProcessStruct>): TraceRow<AppStartupStruct> {
  processRow.setAttribute('hasStartup', 'true');
  let startupRow: TraceRow<AppStartupStruct> = TraceRow.skeleton<AppStartupStruct>();
  startupRow.rowId = `app-start-${processRow.rowId}`;
  startupRow.rowType = TraceRow.ROW_TYPE_APP_STARTUP;
  startupRow.rowParentId = `${processRow.rowId}`;
  startupRow.rowHidden = !processRow.expansion;
  startupRow.index = 0;
  startupRow.style.height = '30px';
  startupRow.style.width = `100%`;
  startupRow.name = `App Startups`;
  startupRow.findHoverStruct = (): void => {
    AppStartupStruct.hoverStartupStruct = startupRow.getHoverStruct();
  }
  startupRow.setAttribute('children', '');
  startupRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
  startupRow.selectChangeHandler = this.trace.selectChangeHandler;
  startupRow.supplierFrame = (): Promise<Array<AppStartupStruct>> =>
    processStartupDataSender(parseInt(processRow.rowId!), startupRow).then((res) => {
      if (res.length <= 0) {
        this.trace.refreshCanvas(true);
      }
      for (let i = 0; i < res.length; i++) {
        if (res[i].startName! < 6 && i < res.length - 1) {
          res[i].endItid = res[i + 1].itid;
        }
      }
      return res;
    });
  startupRow.onThreadHandler = rowThreadHandler<AppStartupRender>('app-start-up', 'appStartupContext', {
    type: `app-startup ${processRow.rowId}`,
  }, startupRow, this.trace);
  processRow.addChildTraceRow(startupRow);
  return startupRow;
}
threadRowFindHoverStruct(threadRow: TraceRow<ThreadStruct>) {
  let arr = threadRow.dataListCache.filter(
    (re) => re.frame && isFrameContainPoint(re.frame, threadRow.hoverX, threadRow.hoverY, true, false)
  );
  let runItem = arr.find(it => it.state === 'Running');
  if (runItem) {
    ThreadStruct.hoverThreadStruct = runItem;
  } else {
    let otherItem = arr.find(it => it.state !== 'S');
    if (otherItem) {
      ThreadStruct.hoverThreadStruct = otherItem;
    } else {
      ThreadStruct.hoverThreadStruct = arr[0];
    }
  }
}