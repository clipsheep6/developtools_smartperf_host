private handleAsyncRequest(cpuByThreadValue: any): void {
    getTabCpuByThread(cpuByThreadValue.cpus, cpuByThreadValue.leftNs, cpuByThreadValue.rightNs).then((result) => {
      this.cpuByThreadTbl!.loading = false;
      if (result != null && result.length > 0) {
        log('getTabCpuByThread size :' + result.length);
        this.processResult(result, cpuByThreadValue);
      } else {
        this.cpuByThreadSource = [];
        this.cpuByThreadTbl!.recycleDataSource = this.cpuByThreadSource;
      }
    });
  }
  private processResult(result: Array<any>, cpuByThreadValue: any): void {
    let sumWall = 0.0;
    let sumOcc = 0;
    let map: Map<string, any> = new Map<string, any>();
    for (let e of result) {
      sumWall += e.wallDuration;
      sumOcc += e.occurrences;
      this.updateThreadMap(e, cpuByThreadValue, map);
    }
    this.calculateCount(map, sumWall, sumOcc);
  }
  private updateThreadMap(e: any, cpuByThreadValue: any, map: Map<string, any>): void {
    if (map.has(`${e.tid}`)) {
      this.updateExistingThread(e, cpuByThreadValue, map);
    } else {
      this.createThread(e, cpuByThreadValue, map);
    }
  }
  private updateExistingThread(e: any, cpuByThreadValue: any, map: Map<string, any>): void {
    let thread = map.get(`${e.tid}`)!;
    thread.wallDuration += e.wallDuration;
    thread.occurrences += e.occurrences;
    this.updateCpuValues(e, cpuByThreadValue, thread);
  }
  private createThread(e: any, cpuByThreadValue: any, map: Map<string, any>): void {
    let process = Utils.PROCESS_MAP.get(e.pid);
    let thread = Utils.THREAD_MAP.get(e.tid);
    let cpuByThreadObject: any = {
      tid: e.tid,
      pid: e.pid,
      thread: thread == null || thread.length == 0 ? '[NULL]' : thread,
      process: process == null || process.length == 0 ? '[NULL]' : process,
      wallDuration: e.wallDuration || 0,
      occurrences: e.occurrences || 0,
      avgDuration: 0,
    };
    this.initializeCpuValues(cpuByThreadValue, cpuByThreadObject);
    this.updateCpuValues(e, cpuByThreadValue, cpuByThreadObject);
    map.set(`${e.tid}`, cpuByThreadObject);
  }
  private initializeCpuValues(cpuByThreadValue: any, cpuByThreadObject: any): void {
    for (let i of cpuByThreadValue.cpus) {
      cpuByThreadObject[`cpu${i}`] = 0;
      cpuByThreadObject[`cpu${i}TimeStr`] = '0';
      cpuByThreadObject[`cpu${i}Ratio`] = '0';
    }
  }
  private updateCpuValues(e: any, cpuByThreadValue: any, cpuByThreadObject: any): void {
    cpuByThreadObject[`cpu${e.cpu}`] = e.wallDuration || 0;
    cpuByThreadObject[`cpu${e.cpu}TimeStr`] = getProbablyTime(e.wallDuration || 0);
    let ratio = (
      (100.0 * (e.wallDuration || 0)) /
      (cpuByThreadValue.rightNs - cpuByThreadValue.leftNs)
    ).toFixed(2);
    if (ratio === '0.00') {
      ratio = '0';
    }
    cpuByThreadObject[`cpu${e.cpu}Ratio`] = ratio;
  }
  private calculateCount(map: Map<string, any>, sumWall: number, sumOcc: number): void {
    let arr = Array.from(map.values()).sort((a, b) => b.wallDuration - a.wallDuration);
    for (let e of arr) {
      e.avgDuration = (e.wallDuration / (e.occurrences || 1.0) / 1000000.0).toFixed(5);
      e.wallDuration = parseFloat((e.wallDuration / 1000000.0).toFixed(5));
    }
    let count: any = {};
    count.process = ' ';
    count.wallDuration = parseFloat((sumWall / 1000000.0).toFixed(7));
    count.occurrences = sumOcc;
    arr.splice(0, 0, count);
    this.cpuByThreadSource = arr;
    this.cpuByThreadTbl!.recycleDataSource = arr;
  }
  getTableColumns(cpus: Array<number>) {
    let cpuByThreadTblHtml = `${this.pubColumns}`;
    let cpuByThreadList = cpus.sort((cpuByThreadA, cpuByThreadB) => cpuByThreadA - cpuByThreadB);
    for (let index of cpuByThreadList) {
      cpuByThreadTblHtml = `${cpuByThreadTblHtml}
            <lit-table-column width="100px" title="cpu${index}" data-index="cpu${index}TimeStr" key="cpu${index}TimeStr"  align="flex-start" order>
            </lit-table-column>
            <lit-table-column width="100px" title="%" data-index="cpu${index}Ratio" key="cpu${index}Ratio"  align="flex-start" order>
            </lit-table-column>
            `;
    }
    return cpuByThreadTblHtml;
  }
  initElements(): void {
    this.cpuByThreadTbl = this.shadowRoot?.querySelector<LitTable>('#tb-cpu-thread');
    this.range = this.shadowRoot?.querySelector('#time-range');
    this.cpuByThreadTbl!.addEventListener('column-click', (evt) => {
      this.sortByColumn(evt.detail);
    });
    this.cpuByThreadTbl!.addEventListener('row-click', (evt: any) => {
      let data = evt.detail.data;
      data.isSelected = true;
      this.cpuByThreadTbl?.clearAllSelection(data);
      this.cpuByThreadTbl?.setCurrentSelection(data);
    });
  }
  connectedCallback() {
    super.connectedCallback();
    resizeObserver(this.parentElement!, this.cpuByThreadTbl!);
  }
  initHtml(): string {
    return `
        <style>
        .cpu-by-thread-label{
            width: 100%;
            height: 20px;
        }
        :host{
            width: auto;
            display: flex;
            flex-direction: column;
            padding: 10px 10px;
        }
        </style>
        <label id="time-range" class="cpu-by-thread-label" style="text-align: end;font-size: 10pt;margin-bottom: 5px">Selected range:0.0 ms</label>
        <lit-table id="tb-cpu-thread" style="height:calc( 30vh - 25px )" >
            
        </lit-table>
        `;
  }
  compare(property: any, sort: any, type: string) {
    return function (cpuByThreadLeftData: SelectionData, cpuByThreadRightData: SelectionData) {
      if (cpuByThreadLeftData.process == ' ' || cpuByThreadRightData.process == ' ') {
        return 0;
      }
      if (type === 'number') {
        return sort === 2 ? parseFloat(cpuByThreadRightData[property]) - parseFloat(cpuByThreadLeftData[property]):parseFloat(cpuByThreadLeftData[property]) - parseFloat(cpuByThreadRightData[property]);
      } else {
        if (cpuByThreadRightData[property] > cpuByThreadLeftData[property]) {
          return sort === 2 ? 1 : -1;
        } else {
          if (cpuByThreadRightData[property] == cpuByThreadLeftData[property]) {
            return 0;
          } else {
            return sort === 2 ? -1 : 1;
          }
        }
      }
    };
  }
  sortByColumn(detail: any) {
    if ((detail.key as string).includes('cpu')) {
      if ((detail.key as string).includes('Ratio')) {
        this.cpuByThreadSource.sort(this.compare(detail.key, detail.sort, 'string'));
      } else {
        this.cpuByThreadSource.sort(this.compare((detail.key as string).replace('TimeStr', ''), detail.sort, 'number'));
      }
    } else {
      if (
        detail.key === 'pid' ||
        detail.key == 'tid' ||
        detail.key === 'wallDuration' ||
        detail.key === 'avgDuration' ||
        detail.key === 'occurrences'
      ) {
        this.cpuByThreadSource.sort(this.compare(detail.key, detail.sort, 'number'));
      } else {
        this.cpuByThreadSource.sort(this.compare(detail.key, detail.sort, 'string'));
      }
    }
    this.cpuByThreadTbl!.recycleDataSource = this.cpuByThreadSource;
  }
  static getAllFlagConfig(): Array<FlagConfigItem> {
    let flagsConfigStr = window.localStorage.getItem(FlagsConfig.FLAGS_CONFIG_KEY);
    if (flagsConfigStr === null) {
      let flagConfigObj: Params = {};
      FlagsConfig.DEFAULT_CONFIG.forEach((config) => {
        let selectedOption = config.switchOptions.filter((option) => {
          return option.selected;
        });
        let value = config.switchOptions[0].option;
        if (selectedOption[0] !== undefined) {
          value = selectedOption[0].option;
        }
        flagConfigObj[config.title] = value;
        if (config.addInfo) {
          for (const [key, value] of Object.entries(config.addInfo)) {
            flagConfigObj[key] = value;
          }
        }
      });
      window.localStorage.setItem(FlagsConfig.FLAGS_CONFIG_KEY, JSON.stringify(flagConfigObj));
      return FlagsConfig.DEFAULT_CONFIG;
    } else {
      let flagsConfig = JSON.parse(flagsConfigStr);
      FlagsConfig.DEFAULT_CONFIG.forEach((config) => {
        let cfg = flagsConfig[config.title];
        if (cfg) {
          config.switchOptions.forEach((option) => {
            if (option.option === cfg) {
              option.selected = true;
            } else {
              option.selected = false;
            }
          });
        }
        if (config.addInfo) {
          for (const [key, value] of Object.entries(config.addInfo)) {
            let cfg = flagsConfig[key];
            if (cfg) {
              config.addInfo[key] = cfg;
            }
          }
        }
      });
    }
    return FlagsConfig.DEFAULT_CONFIG;
  }
  static getSpTraceStreamParseConfig(): string {
    let parseConfig = {};
    FlagsConfig.getAllFlagConfig().forEach((configItem) => {
      let selectedOption = configItem.switchOptions.filter((option) => {
        return option.selected;
      });
      parseConfig[configItem.title] = selectedOption[0].option === 'Enabled' ? 1 : 0;
    });
    return JSON.stringify({ config: parseConfig });
  }
  static getFlagsConfig(flagName: string): Params | undefined {
    let flagConfigObj: Params = {};
    let configItem = FlagsConfig.getAllFlagConfig().find((config) => {
      return config.title === flagName;
    });
    if (configItem) {
      let selectedOption = configItem.switchOptions.filter((option) => {
        return option.selected;
      });
      let value = configItem.switchOptions[0].option;
      if (selectedOption[0] !== undefined) {
        value = selectedOption[0].option;
      }
      flagConfigObj[configItem.title] = value;
      if (configItem.addInfo) {
        for (const [key, value] of Object.entries(configItem.addInfo)) {
          flagConfigObj[key] = value;
        }
      }
      return flagConfigObj;
    } else {
      return configItem;
    }
  }
  static getFlagsConfigEnableStatus(flagName: string): boolean {
    let config = FlagsConfig.getFlagsConfig(flagName);
    let enable: boolean = false;
    if (config && config[flagName]) {
      enable = config[flagName] === 'Enabled';
    }
    return enable;
  }
  static updateFlagsConfig(key: string, value: unknown): void {
    let flagsConfigStr = window.localStorage.getItem(FlagsConfig.FLAGS_CONFIG_KEY);
    let flagConfigObj: Params = {};
    if (flagsConfigStr !== null) {
      flagConfigObj = JSON.parse(flagsConfigStr);
    }
    flagConfigObj[key] = value;
    window.localStorage.setItem(FlagsConfig.FLAGS_CONFIG_KEY, JSON.stringify(flagConfigObj));
  }
export interface FlagConfigItem {
  title: string;
  switchOptions: OptionItem[];
  describeContent: string;
  addInfo?: Params;
}
export interface OptionItem {
  option: string;
  selected?: boolean;
}
private validationFun(threadIdValue: string, threadFuncName: string, fun: string): void {
    if (threadIdValue === '') {
      this.handleEmptyInput(this._threadId!);
    } else if (threadFuncName === '') {
      this.handleEmptyInput(this._threadFunc!);
    } else {
      this._threadId!.style.border = '1px solid rgb(151, 151, 151)';
      this._threadFunc!.style.border = '1px solid rgb(151, 151, 151)';
      if (fun === 'Single') {
        this.isTrue(threadIdValue, threadFuncName, true, false);
      };
      if (fun === 'Loop') {
        this.isTrue(threadIdValue, threadFuncName, false, true);
      };
    };
  };
  private handleEmptyInput(input: HTMLInputElement): void {
    this.threadStatesTbl!.loading = false;
    input!.style.border = '1px solid rgb(255,0,0)';
    this.threadStatesTbl!.recycleDataSource = [];
  };
  private isTrue(threadIdValue: string, threadFuncName: string, single: boolean, loop: boolean): void {
    this.getGpufreqDataCut(threadIdValue, threadFuncName,
      this.currentSelectionParam!.leftNs,
      this.currentSelectionParam!.rightNs,
      single, loop
    ).then((result: Array<SearchGpuFuncBean>) => {
      let _initData = JSON.parse(JSON.stringify(this.initData));
      this.handleDataCut(_initData, result);
    });
  };
  private handleDataCut(initData: Array<GpuCountBean>, dataCut: Array<SearchGpuFuncBean>): void {
    if (initData.length > 0 && dataCut.length > 0) {
      let finalGpufreqData: Array<TreeDataStringBean> = new Array();
      let startPoint: number = initData[0].startNS;
      let _dataCut: Array<SearchGpuFuncBean> = dataCut.filter((i) => i.startTime >= startPoint);
      let _lastList: Array<GpuCountBean> = [];
      let i: number = 0;
      let j: number = 0;
      let currentIndex: number = 0;
      while (i < _dataCut.length) {
        let dataItem: SearchGpuFuncBean = _dataCut[i];
        let initItem: GpuCountBean = initData[j];
        _lastList.push(...this.segmentationData(initItem, dataItem, i));
        j++;
        currentIndex++;
        if (currentIndex === initData.length) {
          i++;
          j = 0;
          currentIndex = 0;
        };
      };
      let tree: TreeDataStringBean = this.createTree(_lastList);
      finalGpufreqData.push(tree);
      this.threadStatesTbl!.recycleDataSource = finalGpufreqData;
      this.threadStatesTbl!.loading = false;
      this.clickTableHeader(finalGpufreqData);

    } else {
      this.threadStatesTbl!.recycleDataSource = [];
      this.threadStatesTbl!.loading = false;
      SpSegmentationChart.setChartData('GPU-FREQ', []);
    };
  };
  private getDataByPriority(source: Array<Priority>): void {
    const priorityMap: Map<string, Priority> = new Map<string, Priority>();
    const stateMap: Map<string, Priority> = new Map<string, Priority>();
    this.prepareMaps(source, priorityMap, stateMap);
    const priorityArr: Array<Priority> = [];
    for (const key of priorityMap.keys()) {
      const ptsValues = priorityMap.get(key);
      ptsValues!.children = [];
      for (const itemKey of stateMap.keys()) {
        if (itemKey.startsWith(key + '_')) {
          const sp = stateMap.get(itemKey);
          ptsValues!.children.push(sp!);
        }
      }
      priorityArr.push(ptsValues!);
    }
    this.priorityTbl!.loading = false;
    this.priorityTbl!.recycleDataSource = priorityArr;
    this.theadClick(priorityArr);
  }
  private prepareMaps(source: Array<Priority>, priorityMap: Map<string, Priority>, stateMap: Map<string, Priority>) {
    source.map((priorityItem) => {
      if (priorityMap.has(priorityItem.priorityType + '')) {
        const priorityMapObj = priorityMap.get(priorityItem.priorityType + '');
        priorityMapObj!.count++;
        priorityMapObj!.wallDuration += priorityItem.dur;
        priorityMapObj!.avgDuration = (priorityMapObj!.wallDuration / priorityMapObj!.count).toFixed(2);
        if (priorityItem.dur > priorityMapObj!.maxDuration) {
          priorityMapObj!.maxDuration = priorityItem.dur;
        }
        if (priorityItem.dur < priorityMapObj!.minDuration) {
          priorityMapObj!.minDuration = priorityItem.dur;
        }
      } else {
        const stateMapObj = new Priority();
        stateMapObj.title = priorityItem.priorityType;
        stateMapObj.minDuration = priorityItem.dur;
        stateMapObj.maxDuration = priorityItem.dur;
        stateMapObj.count = 1;
        stateMapObj.avgDuration = priorityItem.dur + '';
        stateMapObj.wallDuration = priorityItem.dur;
        priorityMap.set(priorityItem.priorityType + '', stateMapObj);
      }
      if (stateMap.has(priorityItem.priorityType + '_' + priorityItem.state)) {
        const ptsPtMapObj = stateMap.get(priorityItem.priorityType + '_' + priorityItem.state);
        ptsPtMapObj!.count++;
        ptsPtMapObj!.wallDuration += priorityItem.dur;
        ptsPtMapObj!.avgDuration = (ptsPtMapObj!.wallDuration / ptsPtMapObj!.count).toFixed(2);
        if (priorityItem.dur > ptsPtMapObj!.maxDuration) {
          ptsPtMapObj!.maxDuration = priorityItem.dur;
        }
        if (priorityItem.dur < ptsPtMapObj!.minDuration) {
          ptsPtMapObj!.minDuration = priorityItem.dur;
        }
      } else {
        const ptsPtMapObj = new Priority();
        ptsPtMapObj.title = priorityItem.state;
        ptsPtMapObj.minDuration = priorityItem.dur;
        ptsPtMapObj.maxDuration = priorityItem.dur;
        ptsPtMapObj.count = 1;
        ptsPtMapObj.avgDuration = priorityItem.dur + '';
        ptsPtMapObj.wallDuration = priorityItem.dur;
        stateMap.set(priorityItem.priorityType + '_' + priorityItem.state, ptsPtMapObj);
      }
    });
  }
  private theadClick(data: Array<Priority>) {
    let labels = this.priorityTbl?.shadowRoot?.querySelector('.th > .td')!.querySelectorAll('label');
    if (labels) {
      for (let i = 0; i < labels.length; i++) {
        let label = labels[i].innerHTML;
        labels[i].addEventListener('click', (e) => {
          if (label.includes('Priority') && i === 0) {
            this.priorityTbl!.setStatus(data, false);
            this.priorityTbl!.recycleDs = this.priorityTbl!.meauseTreeRowElement(data, RedrawTreeForm.Retract);
          } else if (label.includes('State') && i === 1) {
            this.priorityTbl!.setStatus(data, true);
            this.priorityTbl!.recycleDs = this.priorityTbl!.meauseTreeRowElement(data, RedrawTreeForm.Expand);
          }
        });
      }
    }
  }
  calInstructionRangeCount(isCycles: boolean) {
    if (this.onReadableData.length === 0) return;
    this.cacheData.length = 0;
    const count = this.onReadableData.length;
    let instructions = {};
    if (isCycles) {
      instructions = this.onReadableData.reduce((pre: any, current: any) => {
        (pre[`${Math.ceil(current.cycles)}`] = pre[`${Math.ceil(current.cycles)}`] || []).push(current);
        return pre;
      }, {})
    } else {
      instructions = this.onReadableData.reduce((pre: any, current: any) => {
        (pre[`${Math.ceil(current.instructions)}`] = pre[`${Math.ceil(current.instructions)}`] || []).push(current);
        return pre;
      }, {})
    }
    this.ctx!.clearRect(0, 0, this.instructionChartEle!.width, this.instructionChartEle!.height);
    this.instructionChartEle!.width = this.clientWidth;
    this.xMaxValue = Object.keys(instructions).map(i => Number(i)).reduce((pre, cur) => Math.max(pre, cur), 0) + 10;
    const yMaxValue = Object.values(instructions).reduce((pre: number, cur: any) => Math.max(pre, Number((cur.length / count).toFixed(2))), 0);
    this.yAvg = Number((yMaxValue / 5 * 1.5).toFixed(2)) || yMaxValue;
    const height = this.instructionChartEle!.height;
    const width = this.instructionChartEle!.width;
    this.drawLineLabelMarkers(width, height, isCycles);
    this.drawBar(instructions, height, count);
  }
  function rightStarOnClick(sp: SpSystemTrace) {
    return function (ev: any): void {
      let wakeupLists = [];
      wakeupLists.push(CpuStruct.selectCpuStruct?.cpu);
      for (let wakeupBean of SpSystemTrace.wakeupList) {
        wakeupLists.push(wakeupBean.cpu);
      }
      let wakeupCpuLists = Array.from(new Set(wakeupLists)).sort();
      for (let wakeupCpu of wakeupCpuLists) {
        let cpuFavoriteRow: any = sp.shadowRoot?.querySelector<TraceRow<any>>(
          `trace-row[row-type='cpu-data'][row-id='${wakeupCpu}']`
        );
        if (cpuFavoriteRow === null || cpuFavoriteRow === undefined) {
          continue;
        }
        cpuFavoriteRow!.setAttribute('collect-type', '');
        let replaceRow = document.createElement('div');
        replaceRow.setAttribute('row-id', `${cpuFavoriteRow.rowId}-${cpuFavoriteRow.rowType}`);
        replaceRow.setAttribute('type', 'replaceRow');
        replaceRow.setAttribute('row-parent-id', cpuFavoriteRow.rowParentId);
        replaceRow.style.display = 'none';
        cpuFavoriteRow.rowHidden = !cpuFavoriteRow.hasAttribute('scene');
        if (sp.rowsEL!.contains(cpuFavoriteRow)) {
          sp.rowsEL!.replaceChild(replaceRow, cpuFavoriteRow);
        }
        cpuFavoriteRow.tampName = cpuFavoriteRow.name;
        sp.favoriteChartListEL!.insertRow(cpuFavoriteRow, sp.currentCollectGroup, true);
        sp.collectRows.push(cpuFavoriteRow);
        sp.timerShaftEL?.displayCollect(sp.collectRows.length !== 0);
        sp.currentClickRow = null;
        cpuFavoriteRow.setAttribute('draggable', 'true');
        cpuFavoriteRow.addEventListener('dragstart', cpuFavoriteRowDragStart(sp, cpuFavoriteRow));
        cpuFavoriteRow.addEventListener('dragover', cpuFavoriteRowDragOver(sp));
        cpuFavoriteRow.addEventListener('drop', cpuFavoriteRowDropHandler(sp, cpuFavoriteRow));
        cpuFavoriteRow.addEventListener('dragend', cpuFavoriteRowDragendHandler(sp));
      }
      sp.refreshFavoriteCanvas();
      sp.refreshCanvas(true);
    };
  }
  function collectHandlerDragEnd(sp: SpSystemTrace): (ev: any) => void {
    return function (ev: any): void {
      sp.linkNodes.forEach((itln) => {
        if (itln[0].rowEL.collect) {
          if (sp.timerShaftEL?._checkExpand) {
            itln[0].rowEL.translateY =
              itln[0].rowEL.getBoundingClientRect().top - 195 + sp.timerShaftEL._usageFoldHeight!;
          } else {
            itln[0].rowEL.translateY = itln[0].rowEL.getBoundingClientRect().top - 195;
          }
        } else {
          itln[0].rowEL.translateY = itln[0].rowEL.offsetTop - sp.rowsPaneEL!.scrollTop;
        }
        if (itln[1].rowEL.collect) {
          if (sp.timerShaftEL?._checkExpand) {
            itln[1].rowEL.translateY =
              itln[1].rowEL.getBoundingClientRect().top - 195 + sp.timerShaftEL._usageFoldHeight!;
          } else {
            itln[1].rowEL.translateY = itln[1].rowEL.getBoundingClientRect().top - 195;
          }
        } else {
          itln[1].rowEL.translateY = itln[1].rowEL.offsetTop - sp.rowsPaneEL!.scrollTop;
        }
        itln[0].y = itln[0].rowEL.translateY + itln[0].offsetY;
        itln[1].y = itln[1].rowEL.translateY + itln[1].offsetY;
      });
      sp.currentClickRow = null;
    };
  }
  function spSystemTraceInitElement(sp: SpSystemTrace): void {
    window.subscribe(window.SmartEvent.UI.LoadFinishFrame, () => sp.drawAllLines());
    sp.traceSheetEL = sp.shadowRoot?.querySelector<TraceSheet>('.trace-sheet');
    if (!sp || !sp.shadowRoot || !sp.traceSheetEL) {
      return;
    }
    let rightButton: HTMLElement | null | undefined = sp.traceSheetEL.shadowRoot
      ?.querySelector('#current-selection > tabpane-current-selection')
      ?.shadowRoot?.querySelector('#rightButton');
    let rightStar: HTMLElement | null | undefined = sp.traceSheetEL.shadowRoot
      ?.querySelector('#current-selection > tabpane-current-selection')
      ?.shadowRoot?.querySelector('#right-star');
    sp.tipEL = sp.shadowRoot.querySelector<HTMLDivElement>('.tip');
    sp.rowsPaneEL = sp.shadowRoot.querySelector<HTMLDivElement>('.rows-pane');
    sp.rowsEL = sp.rowsPaneEL;
    sp.spacerEL = sp.shadowRoot.querySelector<HTMLDivElement>('.spacer');
    sp.timerShaftEL = sp.shadowRoot.querySelector<TimerShaftElement>('.timer-shaft');
    sp.favoriteChartListEL = sp.shadowRoot.querySelector<SpChartList>('#favorite-chart-list');
    if (!sp.traceSheetEL.shadowRoot) {
      return;
    }
    sp.tabCpuFreq = sp.traceSheetEL.shadowRoot.querySelector<TabPaneFrequencySample>('tabpane-frequency-sample');
    sp.tabCpuState = sp.traceSheetEL.shadowRoot.querySelector<TabPaneCounterSample>('tabpane-counter-sample');
    sp.rangeSelect = new RangeSelect(sp);
    rightButton?.addEventListener('click', rightButtonOnClick(sp, rightStar));
    rightStar?.addEventListener('click', rightStarOnClick(sp));
    documentInitEvent(sp);
    SpSystemTrace.scrollViewWidth = sp.getScrollWidth();
    selectHandler(sp);
    observerHandler(sp);
    window.addEventListener('keydown', windowKeyDownHandler(sp));
    sp.chartManager = new SpChartManager(sp);
    sp.canvasPanel = sp.shadowRoot.querySelector<HTMLCanvasElement>('#canvas-panel')!;
    sp.canvasPanelCtx = sp.canvasPanel.getContext('2d');
    sp.canvasFavoritePanelCtx = sp.favoriteChartListEL!.context();
    sp.canvasPanelConfig();
    smartEventSubscribe(sp);
  }
  function findEntryTypeThreadProcess(sp: SpSystemTrace, findEntry: any): void {
    let threadProcessRow = sp.rowsEL?.querySelectorAll<TraceRow<ThreadStruct>>('trace-row')[0];
    if (threadProcessRow) {
      let filterRow = threadProcessRow.childrenList.filter(
        (row) => row.rowId === findEntry.rowId && row.rowId === findEntry.rowType
      )[0];
      filterRow!.highlight = true;
      sp.closeAllExpandRows(findEntry.rowParentId);
      sp.scrollToProcess(`${findEntry.rowId}`, `${findEntry.rowParentId}`, findEntry.rowType, true);
      let completeEntry = (): void => {
        sp.hoverStructNull();
        sp.selectStructNull();
        sp.wakeupListNull();
        sp.scrollToProcess(`${findEntry.rowId}`, `${findEntry.rowParentId}`, findEntry.rowType, true);
      };
      if (filterRow!.isComplete) {
        completeEntry();
      } else {
        filterRow!.onComplete = completeEntry;
      }
    }
  }
  function expansionChangeHandler(sp: SpSystemTrace, offsetYTimeOut: any): (event: any) => void {
    return function (event: any) {
      let max = [...sp.rowsPaneEL!.querySelectorAll('trace-row')].reduce((pre, cur) => pre + cur.clientHeight!, 0);
      let offset = sp.rowsPaneEL!.scrollHeight - max;
      sp.rowsPaneEL!.scrollTop = sp.rowsPaneEL!.scrollTop - offset;
      JankStruct.delJankLineFlag = false;
      if (offsetYTimeOut) {
        clearTimeout(offsetYTimeOut);
      }
      if (event.detail.expansion) {
        offsetYTimeOut = setTimeout(() => {
          sp.linkNodes.forEach((linkNode) => {
            JankStruct.selectJankStructList?.forEach((selectStruct: any) => {
              if (event.detail.rowId === selectStruct.pid) {
                JankStruct.selectJankStruct = selectStruct;
                JankStruct.hoverJankStruct = selectStruct;
              }
            });
            linkNodeHandler(linkNode, sp);
          });
        }, 300);
      } else {
        if (JankStruct!.selectJankStruct) {
          JankStruct.selectJankStructList?.push(<JankStruct>JankStruct!.selectJankStruct);
        }
        offsetYTimeOut = setTimeout(() => {
          sp.linkNodes?.forEach((linkNode) => linkNodeHandler(linkNode, sp));
        }, 300);
      }
      let refreshTimeOut = setTimeout(() => {
        sp.refreshCanvas(true);
        clearTimeout(refreshTimeOut);
      }, 360);
    };
  }
  private refreshRowNodeTable(useCacheRefresh: boolean = false): void {
    this.logSummaryTable!.innerHTML = '';
    if (this.logSummaryTable && this.parentElement) {
      this.logSummaryTable.style.height = `${this.parentElement!.clientHeight - NUM_30}px`;
    }
    if (!useCacheRefresh) {
      this.logTreeNodes = this.buildTreeTblNodes(this.systemLogSource);
      if (this.logTreeNodes.length > 0) {
        this.summaryDownLoadTbl!.recycleDataSource = this.logTreeNodes;
      } else {
        this.summaryDownLoadTbl!.recycleDataSource = [];
      }
    }
    let tableFragmentEl: DocumentFragment = document.createDocumentFragment();
    let tableTreeEl: HTMLDivElement = document.createElement('div');
    tableTreeEl.className = 'log-tree-table';
    let tableCountEl: HTMLDivElement = document.createElement('div');
    if (this.parentElement) {
      tableTreeEl.style.height = `${this.parentElement!.clientHeight - NUM_40}px`;
    }
    this.createRowNodeTableEL(this.logTreeNodes, tableTreeEl, tableCountEl, '');
    let emptyTr = document.createElement('tr');
    emptyTr.className = 'tree-row-tr';
    tableTreeEl?.appendChild(emptyTr);
    let emptyCountTr = document.createElement('tr');
    emptyCountTr.className = 'tree-row-tr';
    tableCountEl?.appendChild(emptyCountTr);
    tableFragmentEl.appendChild(tableTreeEl);
    tableFragmentEl.appendChild(tableCountEl);
    this.logSummaryTable!.appendChild(tableFragmentEl);
  }
  queryGpuMemoryClickDataByDB(startNs: number): void {
    this.init();
    getTabGpuMemoryAbilityClickData(startNs).then((data) => {
      if (data.length !== null && data.length > 0) {
        data.forEach((item) => {
          if (item.processName !== null) {
            item.process = `${item.processName}(${item.processId})`;
          } else {
            item.process = `Process(${item.processId})`;
          }
          item.sizes = Utils.getBinaryByteWithUnit(item.size);
          item.timeStamp = ns2s(item.startNs);
        });
        this.gpuMemoryClickTables!.recycleDataSource = data.sort(function (
          gpuMemoryLeftData: GpuMemory,
          gpuMemoryRightData: GpuMemory
        ) {
          return gpuMemoryRightData.size - gpuMemoryLeftData.size;
        });
        this.gpuMemoryClickSource = data;
      } else {
        this.gpuMemoryClickTables!.recycleDataSource = [];
        this.gpuMemoryClickSource = [];
      }
    });
  }
  getDataByDB(val: BoxJumpParam) {
    this.boxChildTbl!.loading = true;
    getTabBoxChildData(val.leftNs, val.rightNs, val.cpus, val.state, val.processId, val.threadId).then((result) => {
      this.boxChildTbl!.loading = false;
      if (result.length != null && result.length > 0) {
        result.map((e) => {
          e.startTime = Utils.getTimeString(e.startNs);
          e.absoluteTime = ((window as any).recordStartNS + e.startNs) / 1000000000;
          e.state = Utils.getEndState(e.state)!;
          e.prior = e.priority == undefined || e.priority == null ? '-' : e.priority + '';
          e.core = e.cpu == undefined || e.cpu == null ? '-' : 'CPU' + e.cpu;
          e.processName =
            (e.process == undefined || e.process == null ? 'process' : e.process) + '(' + e.processId + ')';
          e.threadName = (e.thread == undefined || e.thread == null ? 'thread' : e.thread) + '(' + e.threadId + ')';
          e.note = '-';
        });
        this.boxChildSource = result;
        if (this.boxChildTbl) {
          this.boxChildTbl.recycleDataSource = result;
        }
      } else {
        this.boxChildSource = [];
        if (this.boxChildTbl) {
          this.boxChildTbl.recycleDataSource = [];
        }
      }
    });
  }