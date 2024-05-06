private helpClick(urlParams: URLSearchParams) {
    if (urlParams.get('action') === 'help') {
      SpStatisticsHttpUtil.addOrdinaryVisitAction({
        event: 'help_page',
        action: 'help_doc',
      });
      this.spHelp!.dark = this.dark;
      this.showContent(this.spHelp!);
    } else if (urlParams.get('action')!.length > 4) {
      this.showContent(this.spHelp!);
    }
  }
  private openLongTraceFile(ev: any, isRecordTrace: boolean = false) {
    this.returnOriginalUrl();
    this.wasm = true;
    this.openFileInit();
    let detail = (ev as any).detail;
    let initRes = this.longTraceFileInit(isRecordTrace, detail);
    if (!isRecordTrace && initRes) {
      let that = this;
      let readSize = 0;
      let timStamp = new Date().getTime();
      const { traceTypePage, allFileSize, normalTraceNames, specialTraceNames } = initRes;
      if (normalTraceNames.length <= 0) {
        return;
      }
      const readFiles = async (
        files: FileList,
        traceTypePage: Array<number>,
        normalNames: Array<string>,
        specialNames: Array<string>
      ): Promise<any> => {
        const promises = Array.from(files).map((file) => {
          if (normalNames.indexOf(file.name.toLowerCase()) >= 0) {
            return that.longTraceFileRead(file, true, traceTypePage, readSize, timStamp, allFileSize);
          } else if (specialNames.indexOf(file.name.toLowerCase()) >= 0) {
            return that.longTraceFileRead(file, false, traceTypePage, readSize, timStamp, allFileSize);
          } else {
            return;
          }
        });
        return Promise.all(promises);
      };
      this.litSearch!.setPercent('Read in file: ', 1);
      readFiles(detail, traceTypePage, normalTraceNames, specialTraceNames).then(() => {
        this.litSearch!.setPercent('Cut in file: ', 1);
        this.sendCutFileMessage(timStamp);
      });
    }
  }
  private longTraceFileRead = async (
    file: any,
    isNormalType: boolean,
    traceTypePage: Array<number>,
    readSize: number,
    timStamp: number,
    allFileSize: number
  ): Promise<boolean> => {
    info('reading long trace file ', file.name);
    let that = this;
    return new Promise((resolve, reject) => {
      let fr = new FileReader();
      let message = { fileType: '', startIndex: 0, endIndex: 0, size: 0 };
      info('Parse long trace using wasm mode ');
      const { fileType, pageNumber } = this.getFileTypeAndPages(file.name, isNormalType, traceTypePage);
      let chunk = 48 * 1024 * 1024;
      let offset = 0;
      let sliceLen = 0;
      let index = 1;
      fr.onload = function (): void {
        let data = fr.result as ArrayBuffer;
        LongTraceDBUtils.getInstance()
          .addLongTableData(data, fileType, timStamp, pageNumber, index, offset, sliceLen)
          .then(() => {
            that.longTraceFileReadMessagePush(index, isNormalType, pageNumber, offset, sliceLen, fileType, data);
            offset += sliceLen;
            if (offset < file.size) {
              index++;
            }
            continueReading();
          });
      };
      function continueReading(): void {
        if (offset >= file.size) {
          message.endIndex = index;
          message.size = file.size;
          that.longTraceFileReadMessageHandler(pageNumber, message);
          resolve(true);
          return;
        }
        if (index === 1) {
          message.fileType = fileType;
          message.startIndex = index;
        }
        sliceLen = Math.min(file.size - offset, chunk);
        let slice = file.slice(offset, offset + sliceLen);
        readSize += slice.size;
        let percentValue = ((readSize * 100) / allFileSize).toFixed(2);
        that.litSearch!.setPercent('Read in file: ', Number(percentValue));
        fr.readAsArrayBuffer(slice);
      }
      continueReading();
      fr.onerror = (): void => reject(false);
      info('read over long trace file ', file.name);
    });
  };
  getFileTypeAndPages(fileName: string, isNormalType: boolean, traceTypePage: Array<number>): any {
    let fileType = 'trace';
    let pageNumber = 0;
    let firstLastIndexOf = fileName.lastIndexOf('.');
    let firstText = fileName.slice(0, firstLastIndexOf);
    let resultLastIndexOf = firstText.lastIndexOf('_');
    let searchResult = firstText.slice(resultLastIndexOf + 1, firstText.length);
    if (isNormalType) {
      pageNumber = traceTypePage.lastIndexOf(Number(searchResult));
    } else {
      fileType = searchResult;
    }
    return { fileType, pageNumber };
  }
  private longTraceFileInit(isRecordTrace: boolean, detail: any): any {
    if (!this.wasm) {
      this.progressEL!.loading = false;
      return;
    }
    if (this.longTracePage) {
      this.longTracePage.style.display = 'none';
      this.litSearch!.style.marginLeft = '0px';
      this.shadowRoot!.querySelector('.page-number-list')!.innerHTML = '';
    }
    this.currentPageNum = 1;
    if (isRecordTrace) {
      this.sendCutFileMessage(detail.timeStamp);
      return undefined;
    } else {
      this.longTraceHeadMessageList = [];
      this.longTraceTypeMessageMap = undefined;
      this.longTraceDataList = [];
      let traceTypePage: Array<number> = [];
      let allFileSize = 0;
      let normalTraceNames: Array<string> = [];
      let specialTraceNames: Array<string> = [];
      for (let index = 0; index < detail.length; index++) {
        let file = detail[index];
        let fileName = file.name as string;
        allFileSize += file.size;
        let specialMatch = fileName.match(/_(arkts|ebpf|hiperf)\.htrace$/);
        let normalMatch = fileName.match(/_\d{8}_\d{6}_\d+\.htrace$/);
        if (normalMatch) {
          normalTraceNames.push(fileName);
          let fileNameStr = fileName.split('.')[0];
          let pageMatch = fileNameStr.match(/\d+$/);
          if (pageMatch) {
            traceTypePage.push(Number(pageMatch[0]));
          }
        } else if (specialMatch) {
          specialTraceNames.push(fileName);
        }
      }
      if (normalTraceNames.length <= 0) {
        this.traceFileLoadFailedHandler('No large trace files exists in the folder!');
      }
      traceTypePage.sort((leftNum: number, rightNum: number) => leftNum - rightNum);
      return { traceTypePage, allFileSize, normalTraceNames, specialTraceNames };
    }
  }
  longTraceFileReadMessagePush(
    index: number,
    isNormalType: boolean,
    pageNumber: number,
    offset: number,
    sliceLen: number,
    fileType: string,
    data: ArrayBuffer
  ) {
    if (index === 1 && isNormalType) {
      this.longTraceHeadMessageList.push({
        pageNum: pageNumber,
        data: data.slice(offset, 1024),
      });
    }
    this.longTraceDataList.push({
      index: index,
      fileType: fileType,
      pageNum: pageNumber,
      startOffsetSize: offset,
      endOffsetSize: offset + sliceLen,
    });
  }
  longTraceFileReadMessageHandler(pageNumber: number, message: any): void {
    if (this.longTraceTypeMessageMap) {
      if (this.longTraceTypeMessageMap?.has(pageNumber)) {
        let oldTypeList = this.longTraceTypeMessageMap?.get(pageNumber);
        oldTypeList?.push(message);
        this.longTraceTypeMessageMap?.set(pageNumber, oldTypeList!);
      } else {
        this.longTraceTypeMessageMap?.set(pageNumber, [message]);
      }
    } else {
      this.longTraceTypeMessageMap = new Map();
      this.longTraceTypeMessageMap.set(pageNumber, [message]);
    }
  }
  private openMenu(open: boolean): void {
    if (this.mainMenu) {
      this.mainMenu.style.width = open ? '248px' : '0px';
      this.mainMenu.style.zIndex = open ? '2000' : '0';
    }
    if (this.sidebarButton) {
      this.sidebarButton.style.width = open ? '0px' : '48px';
      this.importConfigDiv!.style.left = open ? '5px' : '45px';
      this.closeKeyPath!.style.left = open ? '25px' : '65px';
    }
  }