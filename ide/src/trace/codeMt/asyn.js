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

  addSoInitRow(processRow: TraceRow<ProcessStruct>, maxDepth: number): TraceRow<SoStruct> {
    processRow.setAttribute('hasStaticInit', 'true');
    let maxHeight = (maxDepth + 1) * 20;
    let soRow: TraceRow<SoStruct> = TraceRow.skeleton<SoStruct>();
    soRow.rowId = `app-start-${processRow.rowId}`;
    soRow.rowType = TraceRow.ROW_TYPE_STATIC_INIT;
    soRow.rowParentId = `${processRow.rowId}`;
    soRow.rowHidden = !processRow.expansion;
    soRow.index = 0;
    soRow.style.height = `${maxHeight}px`;
    soRow.style.width = `100%`;
    soRow.name = `Static Initialization`;
    soRow.setAttribute('children', '');
    soRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
    soRow.selectChangeHandler = this.trace.selectChangeHandler;
    soRow.findHoverStruct = (): void => {
      SoStruct.hoverSoStruct = soRow.getHoverStruct();
    }
    soRow.supplierFrame = (): Promise<Array<SoStruct>> =>
      processSoInitDataSender(parseInt(processRow.rowId!), soRow).then((res) => {
        if (res.length <= 0) {
          this.trace.refreshCanvas(true);
        }
        res.forEach((so, index) => {
          let soName = this.soInitNameMap.get(res[index].id!);
          if (soName) {
            so.soName = soName.replace('dlopen: ', '');
          }
        });
        return res;
      });
    soRow.onThreadHandler = rowThreadHandler<SoRender>('app-so-init', 'context', {
      type: `static-init ${processRow.rowId}`,
    }, soRow, this.trace);
    processRow.addChildTraceRow(soRow);
    return soRow;
  }

  insertAfter(newEl: HTMLElement, targetEl: HTMLElement): void {
    let parentEl = targetEl.parentNode;
    if (parentEl!.lastChild == targetEl) {
      parentEl!.appendChild(newEl);
    } else {
      parentEl!.insertBefore(newEl, targetEl.nextSibling);
    }
  }

  //add thread list
  addThreadList(
    it: { pid: number | null; processName: string | null },
    processRow: TraceRow<ProcessStruct>,
    expectedRow: TraceRow<JankStruct> | null,
    actualRow: TraceRow<JankStruct> | null,
    soRow: TraceRow<SoStruct> | undefined,
    startupRow: TraceRow<AppStartupStruct> | undefined
  ) {
    let threads = this.processThreads.filter((thread) => thread.pid === it.pid && thread.tid != 0);
    let threadRowArr: Array<TraceRow<BaseStruct>> = [];
    for (let j = 0; j < threads.length; j++) {
      let thread = threads[j];
      let threadRow = TraceRow.skeleton<ThreadStruct>();
      threadRow.rowId = `${thread.tid}`;
      threadRow.rowType = TraceRow.ROW_TYPE_THREAD;
      threadRow.rowParentId = `${it.pid}`;
      threadRow.rowHidden = !processRow.expansion;
      threadRow.index = j;
      threadRow.style.height = '18px';
      threadRow.style.width = '100%';
      threadRow.name = `${thread.threadName || 'Thread'} ${thread.tid}`;
      threadRow.namePrefix = `${thread.threadName || 'Thread'}`;
      threadRow.setAttribute('children', '');
      threadRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
      threadRow.selectChangeHandler = this.trace.selectChangeHandler;
      threadRow.findHoverStruct = (): void => this.threadRowFindHoverStruct(threadRow);
      threadRow.supplierFrame = async (): Promise<Array<ThreadStruct>> => {
        const res = await threadDataSender(thread.tid || 0, it.pid || 0, threadRow);
        if (res === true) {
          return [];
        } else {
          let rs = res as ThreadStruct[];
          if (rs.length <= 0 && !threadRow.isComplete) {
            this.trace.refreshCanvas(true);
          }
          return rs;
        }
      };
      threadRow.onThreadHandler = rowThreadHandler<ThreadRender>('thread', 'context', {
        type: `thread ${thread.tid} ${thread.threadName}`,
        translateY: threadRow.translateY,
      }, threadRow, this.trace);
      this.insertThreadRowToDocument(it, j, thread, processRow, threadRow, threads, threadRowArr, actualRow, expectedRow, startupRow, soRow);
      this.addFuncStackRow(it, thread, j, threads, threadRowArr, threadRow, processRow);
      if ((thread.switchCount || 0) === 0) {
        threadRow.rowDiscard = true;
      }
    }
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

  insertThreadRowToDocument(
    it: any,
    index: number,
    thread: ThreadStruct,
    processRow: TraceRow<ProcessStruct>,
    threadRow: TraceRow<ThreadStruct>,
    threads: ThreadStruct[],
    threadRowArr: TraceRow<any>[],
    actualRow: TraceRow<any> | null,
    expectedRow: TraceRow<any> | null,
    startupRow: TraceRow<AppStartupStruct> | null | undefined,
    soRow: TraceRow<SoStruct> | null | undefined
  ) {
    if (it.processName === 'render_service') {
      if (threadRow.name === `${it.processName} ${it.pid}`) {
        this.renderRow = threadRow;
      }
      let flag = threads.length === index + 1 && !this.threadFuncMaxDepthMap.has(`${thread.upid}-${thread.tid}`);
      processRow.sortRenderServiceData(threadRow, threadRow, threadRowArr, flag);
    } else {
      if (threadRow.rowId === threadRow.rowParentId) {
        if (actualRow !== null) {
          processRow.addChildTraceRowAfter(threadRow, actualRow);
        } else if (expectedRow !== null) {
          processRow.addChildTraceRowAfter(threadRow, expectedRow);
        } else if (soRow) {
          processRow.addChildTraceRowAfter(threadRow, soRow);
        } else if (startupRow) {
          processRow.addChildTraceRowAfter(threadRow, startupRow);
        } else {
          processRow.addChildTraceRowSpecifyLocation(threadRow, 0);
        }
      } else {
        processRow.addChildTraceRow(threadRow);
      }
    }
  }

  addFuncStackRow(
    process: any,
    thread: any,
    index: number,
    threads: Array<any>,
    threadRowArr: Array<any>,
    threadRow: TraceRow<ThreadStruct>,
    processRow: TraceRow<ProcessStruct>
  ) {
    if (this.threadFuncMaxDepthMap.get(`${thread.upid}-${thread.tid}`) != undefined) {
      let max = this.threadFuncMaxDepthMap.get(`${thread.upid}-${thread.tid}`) || 1;
      let maxHeight = max * 18 + 6;
      let funcRow = TraceRow.skeleton<FuncStruct>();
      funcRow.rowId = `${thread.tid}`;
      funcRow.rowType = TraceRow.ROW_TYPE_FUNC;
      funcRow.enableCollapseChart(); //允许折叠泳道图
      funcRow.rowParentId = `${process.pid}`;
      funcRow.rowHidden = !processRow.expansion;
      funcRow.checkType = threadRow.checkType;
      funcRow.style.width = '100%';
      funcRow.style.height = `${maxHeight}px`;
      funcRow.name = `${thread.threadName || 'Thread'} ${thread.tid}`;
      funcRow.namePrefix = `${thread.threadName || 'Thread'}`;
      funcRow.setAttribute('children', '');
      funcRow.supplierFrame = async (): Promise<Array<FuncStruct>> => {
        const rs = await funcDataSender(thread.tid || 0, thread.upid || 0, funcRow);
        return this.funDataSenderCallback(rs, funcRow, thread);
      };
      funcRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
      funcRow.selectChangeHandler = this.trace.selectChangeHandler;
      funcRow.findHoverStruct = (): void => {
        FuncStruct.hoverFuncStruct = funcRow.getHoverStruct();
      }
      funcRow.onThreadHandler = rowThreadHandler<FuncRender>('func', 'context', {
        type: `func${thread.tid}${thread.threadName}`,
      }, funcRow, this.trace);
      if (process.processName === 'render_service') {
        let flag = threads.length === index + 1;
        processRow.sortRenderServiceData(funcRow, threadRow, threadRowArr, flag);
      } else {
        processRow.addChildTraceRowAfter(funcRow, threadRow);
      }
    }
  }

  funDataSenderCallback(rs: Array<any> | boolean, funcRow: TraceRow<FuncStruct>, thread: ThreadStruct): FuncStruct[] {
    if (rs === true) {
      funcRow.rowDiscard = true;
      return [];
    } else {
      let funs = rs as FuncStruct[];
      if (funs.length > 0) {
        funs.forEach((fun, index) => {
          funs[index].itid = thread.utid;
          funs[index].ipid = thread.upid;
          funs[index].funName = this.funcNameMap.get(funs[index].id!);
          if (Utils.isBinder(fun)) {
          } else {
            if (fun.nofinish) {
              fun.flag = 'Did not end';
            }
          }
        });
      } else {
        this.trace.refreshCanvas(true);
      }
      return funs;
    }
  }

  //进程内存信息
  addProcessMemInfo(
    it: { pid: number | null; processName: string | null },
    processRow: TraceRow<ProcessStruct>
  ) {
    let processMem = this.processMem.filter((mem) => mem.pid === it.pid);
    processMem.forEach((mem) => {
      let row = TraceRow.skeleton<ProcessMemStruct>();
      row.rowId = `${mem.trackId}`;
      row.rowType = TraceRow.ROW_TYPE_MEM;
      row.rowParentId = `${it.pid}`;
      row.rowHidden = !processRow.expansion;
      row.style.height = '40px';
      row.style.width = '100%';
      row.name = `${mem.trackName}`;
      row.setAttribute('children', '');
      row.favoriteChangeHandler = this.trace.favoriteChangeHandler;
      row.selectChangeHandler = this.trace.selectChangeHandler;
      row.focusHandler = (): void => {
        this.trace.displayTip(row, ProcessMemStruct.hoverProcessMemStruct, `<span>${ProcessMemStruct.hoverProcessMemStruct?.value || '0'}</span>`);
      };
      row.findHoverStruct = (): void => {
        ProcessMemStruct.hoverProcessMemStruct = row.getHoverStruct(false);
      };
      row.supplierFrame = (): Promise<Array<ProcessMemStruct>> =>
        processMemDataSender(mem.trackId, row).then((resultProcess) => {
          let maxValue = this.filterIdMaxValue.get(mem.trackId) || 0;
          for (let j = 0; j < resultProcess.length; j++) {
            resultProcess[j].maxValue = maxValue;
            if (j === resultProcess.length - 1) {
              resultProcess[j].duration = (TraceRow.range?.totalNS || 0) - (resultProcess[j].startTime || 0);
            } else {
              resultProcess[j].duration = (resultProcess[j + 1].startTime || 0) - (resultProcess[j].startTime || 0);
            }
            if (j > 0) {
              resultProcess[j].delta = (resultProcess[j].value || 0) - (resultProcess[j - 1].value || 0);
            } else {
              resultProcess[j].delta = 0;
            }
          }
          return resultProcess;
        });
      row.onThreadHandler = rowThreadHandler<MemRender>('mem', 'context', {
        type: `mem ${mem.trackId} ${mem.trackName}`,
      }, row, this.trace);
      if (this.renderRow && row.name === 'H:PreferredFrameRate') {
        processRow.addChildTraceRowBefore(row, this.renderRow);
      } else {
        processRow.addChildTraceRow(row);
      }
    });
  }
  private calMaxHeight(asyncFunctions: any[]): number {
    let max = 0;
    asyncFunctions.forEach((it) => {
      const depth = it.depth || 0;
      if (depth > max) {
        max = depth;
      }
    });
    max += 1;
    return max * 18 + 6;;
  }

  //Async Function
  addAsyncFunction(it: { pid: number; processName: string | null }, processRow: TraceRow<ProcessStruct>) {
    let asyncFuncList = this.processAsyncFuncMap[it.pid] || [];
    if (!asyncFuncList.length) { return };
    let asyncCatMap: Map<string, any> = new Map<string, any>();
    let asyncRemoveCatArr: any = [];
    //取出cat字段（category）不为null的数据
    for (let i = 0; i < asyncFuncList.length; i++) {
      const ele = asyncFuncList[i];
      if (ele.cat !== null) {
        if (asyncCatMap.has(`${ele.cat}:${ele.threadName} ${ele.tid}`)) {
          let item = asyncCatMap.get(`${ele.cat}:${ele.threadName} ${ele.tid}`);
          item.push(ele);
        } else {
          asyncCatMap.set(`${ele.cat}:${ele.threadName} ${ele.tid}`, [ele]);
        }
      } else {
        //取cat字段为null的数据
        asyncRemoveCatArr.push(ele);
      }
    }
    if (asyncCatMap.size > 0) {
      for (const [key, asyncCatFunc] of asyncCatMap.entries()) {
        this.makeAddAsyncFunction(asyncCatFunc, it, processRow, key)
      }
    }

    //处理cat字段为null的数据，按funname分类，分别按len>1和=1去处理
    let asyncFuncGroup = Utils.groupBy(asyncRemoveCatArr, 'funName');
    let asyncFuncArr: any[] = [];
    Reflect.ownKeys(asyncFuncGroup).map((key: any) => {
      let asyncFunctions: Array<any> = asyncFuncGroup[key];
      if (asyncFunctions.length > 1) {
        this.makeAddAsyncFunction(asyncFunctions, it, processRow)
      } else if (asyncFunctions.length === 1) {
        asyncFuncArr.push(...asyncFunctions);
      }
    });
    //len=1的数据继续按tid分类
    if (asyncFuncArr.length) {
      let asyncFuncTidGroup = Utils.groupBy(asyncFuncArr, 'tid');
      Reflect.ownKeys(asyncFuncTidGroup).map((key: any) => {
        let asyncTidFunc: Array<any> = asyncFuncTidGroup[key];
        let rowName = `H:${asyncTidFunc[0].threadName} ${asyncTidFunc[0].tid}`;
        this.makeAddAsyncFunction(asyncTidFunc, it, processRow, rowName)
      });
    }
  }
  makeAddAsyncFunction(asyncFunctions: any[], it: { pid: number; processName: string | null }, processRow: TraceRow<ProcessStruct>, type?: string) {
    let isIntersect = (a: any, b: any): boolean =>
      Math.max(a.startTs + a.dur, b.startTs + b.dur) - Math.min(a.startTs, b.startTs) < a.dur + b.dur;
    let depthArray: any = [];
    if (type) {
      let maxDepth: number = -1;
      let normalIndex = 0;
      let mapDepth = new Map();
      let noEndData = asyncFunctions.filter((item) => item.dur === null);
      let normalData = asyncFunctions.filter((item) => item.dur !== null);
      if (normalData.length) {
        while (normalIndex < normalData.length) {
          let itemEndTime = normalData[normalIndex].startTs + normalData[normalIndex].dur;
          let itemi = -1;
          for (let [, val] of mapDepth.entries()) {
            if (val.item < normalData[normalIndex].startTs) {
              itemi = val.depth;
              break;
            }
          }
          if (itemi !== -1) {
            if (mapDepth.has(`${itemi}`)) {
              let obj = mapDepth.get(`${itemi}`)
              obj.item = itemEndTime
              normalData[normalIndex].depth = obj.depth;
              normalIndex++;
            }
          } else {
            maxDepth = maxDepth + 1;
            mapDepth.set(`${maxDepth}`, {
              item: itemEndTime,
              depth: maxDepth
            })
            normalData[normalIndex].depth = maxDepth;
            normalIndex++;
          }
        }
        if (noEndData.length) {
          noEndData.forEach((it, i) => {
            if (it.dur === -1 || it.dur === null || it.dur === undefined) {
              it.dur = (TraceRow.range?.endNS || 0) - it.startTs;
              it.flag = 'Did not end';
            }
            let index = i;
            maxDepth++;
            noEndData[index].depth = maxDepth;
          });
        }
        this.lanesConfig([...normalData, ...noEndData], it, processRow, type);
      }
    } else {
      asyncFunctions.forEach((it, i) => {
        if (it.dur === -1 || it.dur === null || it.dur === undefined) {
          it.dur = (TraceRow.range?.endNS || 0) - it.startTs;
          it.flag = 'Did not end';
        }
        let currentDepth = 0;
        let index = i;
        while (depthArray[currentDepth] !== undefined && isIntersect(depthArray[currentDepth], asyncFunctions[index])) {
          currentDepth++;
        }
        asyncFunctions[index].depth = currentDepth;
        depthArray[currentDepth] = asyncFunctions[index];
      });
      this.lanesConfig(asyncFunctions, it, processRow)
    }
  }
  lanesConfig(asyncFunctions: any[], it: { pid: number; processName: string | null }, processRow: TraceRow<ProcessStruct>, name?: string) {
    const maxHeight = this.calMaxHeight(asyncFunctions);
    let funcRow = TraceRow.skeleton<FuncStruct>();
    funcRow.rowId = `${asyncFunctions[0].funName}-${it.pid}`;
    funcRow.asyncFuncName = asyncFunctions[0].funName;
    funcRow.asyncFuncNamePID = it.pid;
    funcRow.rowType = TraceRow.ROW_TYPE_FUNC;
    funcRow.enableCollapseChart(); //允许折叠泳道图
    funcRow.rowParentId = `${it.pid}`;
    funcRow.rowHidden = !processRow.expansion;
    funcRow.style.width = '100%';
    funcRow.style.height = `${maxHeight}px`;
    funcRow.setAttribute('height', `${maxHeight}`);
    funcRow.name = name ? name : `${asyncFunctions[0].funName}`;
    funcRow.setAttribute('children', '');
    funcRow.findHoverStruct = (): void => {
      FuncStruct.hoverFuncStruct = funcRow.getHoverStruct();
    }
    funcRow.supplier = (): Promise<any> => new Promise((resolve) => resolve(asyncFunctions));
    funcRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
    funcRow.selectChangeHandler = this.trace.selectChangeHandler;
    funcRow.onThreadHandler = rowThreadHandler<FuncRender>('func', 'context', {
      type: `func-${asyncFunctions[0].funName}-${it.pid}`,
    }, funcRow, this.trace);
    processRow.addChildTraceRow(funcRow);
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
  /* Janks Frames */
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
  /* Janks Frames */
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