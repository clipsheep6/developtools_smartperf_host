initThreadRow(pRow: TraceRow<BaseStruct>, res: unknown) {
    //@ts-ignore
    for (let j = 0; j < res.length; j++) {
        //初始化线程
        //@ts-ignore
        let thread = res[j];
        let tRow = TraceRow.skeleton<ThreadStruct>();
        tRow.rowId = `${pRow.rowId}${thread.tid}`;
        tRow.rowType = TraceRow.ROW_TYPE_THREAD;
        tRow.rowParentId = `${pRow.rowId}`;
        tRow.rowHidden = !pRow.expansion;
        tRow.protoPid = thread.pid;
        tRow.index = j;
        tRow.style.height = '18px';
        tRow.style.width = '100%';
        tRow.name = `${thread.threadName || 'Thread'} ${thread.tid}`;
        tRow.namePrefix = `${thread.threadName || 'Thread'}`;
        tRow.setAttribute('children', '');
        tRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
        tRow.selectChangeHandler = this.trace.selectChangeHandler;
        // tRow.findHoverStruct = (): void => this.threadRowFindHoverStruct(tRow);
        tRow.supplierFrame = async (): Promise<Array<ThreadStruct>> => {
            const res = await threadDataSender(thread.tid || 0, thread.pid || 0, tRow);
            if (res === true) {
                return [];
            }
            let rs = res as ThreadStruct[];
            if (rs.length <= 0 && !tRow.isComplete) {
                this.trace.refreshCanvas(true);
            }
            return rs;
        };
        tRow.onThreadHandler = rowThreadHandler<ThreadRender>(
            'thread',
            'context',
            {
                type: `thread ${thread.tid} ${thread.threadName}`,
                translateY: tRow.translateY,
            },
            tRow,
            this.trace
        );
        pRow.addChildTraceRow(tRow);
        this.addFuncStackRow(pRow, thread, tRow);
    }
}
addFuncStackRow(
    pRow: TraceRow<BaseStruct>,
    thread: unknown,
    threadRow: TraceRow<ThreadStruct>,
): void {
    //初始化方法
    //@ts-ignore
    if (this.threadFuncMaxDepthMap.get(`${thread.ipid}-${thread.tid}`) !== undefined) {
        //@ts-ignore
        let max = this.threadFuncMaxDepthMap.get(`${thread.ipid}-${thread.tid}`) || 1;
        let maxHeight = max * 18 + 6;
        let funcRow = TraceRow.skeleton<FuncStruct>();
        //@ts-ignore
        funcRow.rowId = `${pRow.rowId}${thread.tid}`;
        funcRow.rowType = TraceRow.ROW_TYPE_FUNC;
        funcRow.enableCollapseChart(FOLD_HEIGHT, this.trace); //允许折叠泳道图
        //@ts-ignore
        funcRow.rowParentId = `${pRow.rowId}`;
        funcRow.rowHidden = pRow.expansion;
        funcRow.checkType = threadRow.checkType;
        // funcRow.protoParentId = parentRows?.[0].name;
        //@ts-ignore
        funcRow.protoPid = thread.pid;
        funcRow.style.width = '100%';
        funcRow.style.height = `${maxHeight}px`;
        //@ts-ignore
        funcRow.name = `${thread.threadName || 'Thread'} ${thread.tid}`;
        //@ts-ignore
        funcRow.namePrefix = `${thread.threadName || 'Thread'}`;
        funcRow.setAttribute('children', '');
        funcRow.supplierFrame = async (): Promise<Array<FuncStruct>> => {
            //@ts-ignore
            const rs = await funcDataSender(thread.tid || 0, thread.ipid || 0, funcRow);
            return this.funDataSenderCallback(rs, funcRow, thread);
        };
        funcRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
        funcRow.selectChangeHandler = this.trace.selectChangeHandler;
        funcRow.findHoverStruct = (): void => {
            FuncStruct.hoverFuncStruct = funcRow.getHoverStruct();
        };
        funcRow.onThreadHandler = rowThreadHandler<FuncRender>(
            'func',
            'context',
            {
                //@ts-ignore
                type: `func${thread.tid}${thread.threadName}`,
            },
            funcRow,
            this.trace
        );
        pRow.addChildTraceRowAfter(funcRow, threadRow);
    }
}