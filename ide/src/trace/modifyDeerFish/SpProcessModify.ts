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
