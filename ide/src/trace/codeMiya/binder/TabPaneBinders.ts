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
import { type LitTable, RedrawTreeForm } from '../../../../../base-ui/table/lit-table';
import { SelectionData, SelectionParam } from '../../../../bean/BoxSelection';
import '../../../StackBar';
import { queryBinderByThreadId } from '../../../../database/SqlLite';
import { Utils } from '../../base/Utils';
import { resizeObserver } from '../SheetUtils';
import { type BinderGroup, type BinderItem } from '../../../../bean/BinderProcessThread';
import { SliceGroup } from '../../../../bean/StateProcessThread';

@element('tabpane-binders')
export class TabPaneBinders extends BaseElement {
  private threadBindersTbl: LitTable | null | undefined;
  private threadBindersTblSource: Array<SelectionData> = [];
  private currentSelectionParam: Selection | undefined;

  set data(threadStatesParam: SelectionParam | any) {
    if (this.currentSelectionParam === threadStatesParam) {
      return;
    }
    this.currentSelectionParam = threadStatesParam;
    this.initBinderData(threadStatesParam);
  }

  initBinderData(threadStatesParam: SelectionParam): void {
    this.threadBindersTbl!.loading = true;
    this.threadBindersTbl!.recycleDataSource = [];
    let binderList: BinderItem[] = [];
    let threadIds = threadStatesParam.threadIds;
    let processIds: number[] = [...new Set(threadStatesParam.processIds)];
    queryBinderByThreadId(processIds, threadIds, threadStatesParam.leftNs, threadStatesParam.rightNs).then((result) => {
      if (result !== null && result.length > 0) {
        binderList = result;
      }
      if (binderList.length > 0) {
        this.threadBindersTbl!.recycleDataSource = this.transferToTreeData(binderList);
        this.threadBindersTblSource = this.threadBindersTbl!.recycleDataSource;
        this.threadBindersTbl!.loading = false;
        this.tHeadClick(this.threadBindersTbl!.recycleDataSource);
      } else if (binderList.length === 0) {
        this.threadBindersTbl!.recycleDataSource = [];
        this.threadBindersTblSource = [];
        this.threadBindersTbl!.loading = false;
        this.tHeadClick(this.threadBindersTbl!.recycleDataSource);
      }
    });
  }

  transferToTreeData(binderList: BinderItem[]): BinderGroup[] {
    let group: any = {};
    binderList.forEach((it: BinderItem) => {
      if (group[`${it.pid}`]) {
        let process = group[`${it.pid}`];
        process.totalCount += 1;
        let thread = process.children.find((child: BinderGroup) => child.title === `T-${it.tid}`);
        if (thread) {
          thread.totalCount += 1;
          thread.binderTransactionCount += it.name === 'binder transaction' ? 1 : 0;
          thread.binderAsyncRcvCount += it.name === 'binder async rcv' ? 1 : 0;
          thread.binderReplyCount += it.name === 'binder reply' ? 1 : 0;
          thread.binderTransactionAsyncCount += it.name === 'binder transaction async' ? 1 : 0;
        } else {
          process.children.push({
            title: `T-${it.tid}`,
            totalCount: 1,
            binderTransactionCount: it.name === 'binder transaction' ? 1 : 0,
            binderAsyncRcvCount: it.name === 'binder async rcv' ? 1 : 0,
            binderReplyCount: it.name === 'binder reply' ? 1 : 0,
            binderTransactionAsyncCount: it.name === 'binder transaction async' ? 1 : 0,
            tid: it.tid,
            pid: it.pid,
          });
        }
      } else {
        group[`${it.pid}`] = {
          title: `P-${it.pid}`,
          totalCount: 1,
          tid: it.tid,
          pid: it.pid,
          children: [
            {
              title: `T-${it.tid}`,
              totalCount: 1,
              binderTransactionCount: it.name === 'binder transaction' ? 1 : 0,
              binderAsyncRcvCount: it.name === 'binder async rcv' ? 1 : 0,
              binderReplyCount: it.name === 'binder reply' ? 1 : 0,
              binderTransactionAsyncCount: it.name === 'binder transaction async' ? 1 : 0,
              tid: it.tid,
              pid: it.pid,
            },
          ],
        };
      }
    });
    return Object.values(group);
  }

  private tHeadClick(data: Array<SliceGroup>): void {
    let labels = this.threadBindersTbl?.shadowRoot?.querySelector('.th > .td')!.querySelectorAll('label');
    if (labels) {
      for (let i = 0; i < labels.length; i++) {
        let label = labels[i].innerHTML;
        labels[i].addEventListener('click', () => {
          if (label.includes('Process') && i === 0) {
            this.threadBindersTbl!.setStatus(data, false);
            this.threadBindersTbl!.recycleDs = this.threadBindersTbl!.meauseTreeRowElement(
              data,
              RedrawTreeForm.Retract
            );
          } else if (label.includes('Thread') && i === 1) {
            for (let item of data) {
              item.status = true;
              if (item.children !== undefined && item.children.length > 0) {
                this.threadBindersTbl!.setStatus(item.children, false);
              }
            }
            this.threadBindersTbl!.recycleDs = this.threadBindersTbl!.meauseTreeRowElement(
              data,
              RedrawTreeForm.Retract
            );
          }
        });
      }
    }
  }

  initElements(): void {
    this.threadBindersTbl = this.shadowRoot?.querySelector<LitTable>('#tb-binder-count');
    this.threadBindersTbl!.itemTextHandleMap.set('title', Utils.transferBinderTitle);
  }

  connectedCallback(): void {
    super.connectedCallback();
    resizeObserver(this.parentElement!, this.threadBindersTbl!);
  }

  initHtml(): string {
    return `
      <style>
      :host{
          padding: 10px 10px;
          display: flex;
          flex-direction: column;
      }
      #tb-binder-count{
          height: auto;
          overflow-x: auto;
          width: calc(100vw - 270px)
      }
      </style>
      <lit-table id="tb-binder-count" tree>
          <lit-table-column title="Process/Thread" data-index="title" key="title"  align="flex-start" width="27%" retract>
          </lit-table-column>
          <lit-table-column title="Total count" data-index="totalCount" key="totalCount" align="flex-start">
          </lit-table-column>
          <lit-table-column title="Binder transaction count" data-index="binderTransactionCount" key="binderTransactionCount" align="flex-start">
          </lit-table-column>
          <lit-table-column title="Binder transaction async count" data-index="binderTransactionAsyncCount" key="binderTransactionAsyncCount" align="flex-start">
          </lit-table-column>
          <lit-table-column title="Binder reply count" data-index="binderReplyCount" key="binderReplyCount" align="flex-start">
          </lit-table-column>
          <lit-table-column title="Binder async rcv count" data-index="binderAsyncRcvCount" key="binderAsyncRcvCount" align="flex-start">
          </lit-table-column>
      </lit-table>
  `;
  }
}


self.onmessage = async (e: MessageEvent) => {
  currentAction = e.data.action;
  currentActionId = e.data.id;
  let typeLength = 4;
  if (e.data.action === 'reset') {
    clear();
  } else if (e.data.action === 'open') {
    await initWASM();
    ffrtFileCacheKey = '-1';
    // @ts-ignore
    self.postMessage({
      id: e.data.id,
      action: e.data.action,
      ready: true,
      index: 0,
    });
    let uint8Array = new Uint8Array(e.data.buffer);
    let callback = (heapPtr: number, size: number, isEnd: number) => {
      let out: Uint8Array = Module.HEAPU8.slice(heapPtr, heapPtr + size);
      bufferSlice.push(out);
      if (isEnd == 1) {
        arr = merged();
        bufferSlice.length = 0;
      }
    };
    let fn = Module.addFunction(callback, 'viii');
    reqBufferAddr = Module._Initialize(fn, REQ_BUF_SIZE);
    let ffrtConvertCallback = (heapPtr: number, size: number, isEnd: number) => {
      if (isEnd !== 1) {
        let out: Uint8Array = Module.HEAPU8.slice(heapPtr, heapPtr + size);
        bufferSlice.push(out);
      } else {
        arr = merged();
        bufferSlice.length = 0;
        ffrtFileCacheKey = `ffrt/${new Date().getTime()}-${arr.buffer.byteLength}`;
        saveTraceFileBuffer(ffrtFileCacheKey, arr.buffer);
      }
    };
    let tlvResultCallback = (heapPtr: number, size: number, type: number, isEnd: number) => {
      let out: Uint8Array = Module.HEAPU8.slice(heapPtr, heapPtr + size);
      protoDataMap.set(type, BatchSphData.decode(out).values);
    };
    let fn1 = Module.addFunction(callback, 'viii');
    let fn2 = Module.addFunction(ffrtConvertCallback, 'viii');
    let tlvResultFun = Module.addFunction(tlvResultCallback, 'viiii');
    Module._TraceStreamer_Set_Log_Level(5);
    reqBufferAddr = Module._Initialize(REQ_BUF_SIZE, fn1, tlvResultFun, fn2);
    let parseConfig = e.data.parseConfig;
    if (parseConfig !== '') {
      let parseConfigArray = enc.encode(parseConfig);
      let parseConfigAddr = Module._InitializeParseConfig(1024);
      Module.HEAPU8.set(parseConfigArray, parseConfigAddr);
      Module._TraceStreamerParserConfigEx(parseConfigArray.length);
    }
    let wasmConfigStr = e.data.wasmConfig;
    if (wasmConfigStr != '' && wasmConfigStr.indexOf('WasmFiles') != -1) {
      let wasmConfig = JSON.parse(wasmConfigStr);
      let wasmConfigs = wasmConfig.WasmFiles;
      let itemArray = wasmConfigs.map((item: any) => {
        return item.componentId + ';' + item.pluginName;
      });
      let thirdWasmStr: string = itemArray.join(';');
      let configUintArray = enc.encode(thirdWasmStr + ';');
      Module.HEAPU8.set(configUintArray, reqBufferAddr);
      Module._TraceStreamer_Init_ThirdParty_Config(configUintArray.length);
      let first = true;
      let sendDataCallback = (heapPtr: number, size: number, componentID: number) => {
        if (componentID === 100) {
          if (first) {
            first = false;
            headUnitArray = Module.HEAPU8.slice(heapPtr, heapPtr + size);
          }
          return;
        }
        let configs = wasmConfigs.filter((wasmConfig: any) => {
          return wasmConfig.componentId == componentID;
        });
        if (configs.length > 0) {
          let config = configs[0];
          let model = thirdWasmMap.get(componentID);
          if (!model && config.componentId === componentID) {
            importScripts(config.wasmJsName);
            let thirdMode = initThirdWASM(config.wasmName);
            let configPluginName = config.pluginName;
            let pluginNameUintArray = enc.encode(configPluginName);
            let pluginNameBuffer = thirdMode._InitPluginName(pluginNameUintArray.length);
            thirdMode.HEAPU8.set(pluginNameUintArray, pluginNameBuffer);
            thirdMode._TraceStreamerGetPluginNameEx(configPluginName.length);
            let thirdQueryDataCallBack = (heapPtr: number, size: number, isEnd: number, isConfig: number) => {
              if (isConfig == 1) {
                let out: Uint8Array = thirdMode.HEAPU8.slice(heapPtr, heapPtr + size);
                thirdJsonResult.set(componentID, {
                  jsonConfig: dec.decode(out),
                  disPlayName: config.disPlayName,
                  pluginName: config.pluginName,
                });
              } else {
                let out: Uint8Array = thirdMode.HEAPU8.slice(heapPtr, heapPtr + size);
                bufferSlice.push(out);
                if (isEnd == 1) {
                  arr = merged();
                  bufferSlice.length = 0;
                }
              }
            };
            let fn = thirdMode.addFunction(thirdQueryDataCallBack, 'viiii');
            let thirdreqBufferAddr = thirdMode._Init(fn, REQ_BUF_SIZE);
            let updateTraceTimeCallBack = (heapPtr: number, size: number) => {
              let out: Uint8Array = thirdMode.HEAPU8.slice(heapPtr, heapPtr + size);
              Module.HEAPU8.set(out, reqBufferAddr);
              Module._UpdateTraceTime(out.length);
            };
            let traceRangeFn = thirdMode.addFunction(updateTraceTimeCallBack, 'vii');
            let mm = thirdMode._InitTraceRange(traceRangeFn, 1024);
            thirdMode._TraceStreamer_In_JsonConfig();
            thirdMode.HEAPU8.set(headUnitArray, thirdreqBufferAddr);
            thirdMode._ParserData(headUnitArray!.length, 100);
            let out: Uint8Array = Module.HEAPU8.slice(heapPtr, heapPtr + size);
            thirdMode.HEAPU8.set(out, thirdreqBufferAddr);
            thirdMode._ParserData(out.length, componentID);
            thirdWasmMap.set(componentID, {
              model: thirdMode,
              bufferAddr: thirdreqBufferAddr,
            });
          } else {
            let mm = model.model;
            let out: Uint8Array = Module.HEAPU8.slice(heapPtr, heapPtr + size);
            mm.HEAPU8.set(out, model.bufferAddr);
            mm._ParserData(out.length, componentID);
          }
        }
      };
      let fn1 = Module.addFunction(sendDataCallback, 'viii');
      let reqBufferAddr1 = Module._TraceStreamer_Set_ThirdParty_DataDealer(fn1, REQ_BUF_SIZE);
    }
    let wrSize = 0;
    let r2 = -1;
    let rowTraceStr = Array.from(new Uint16Array(e.data.buffer.slice(0, 2)));
    if (rowTraceStr[0] === 57161) {
      let commonDataOffsetList: Array<{
        startOffset: number;
        endOffset: number;
      }> = [];
      let offset = 12;
      let tlvTypeLength = 4;
      let headArray = uint8Array.slice(0, offset);
      let commonTotalLength = 0;
      while (offset < uint8Array.length) {
        let commonDataOffset = {
          startOffset: offset,
          endOffset: offset,
        };
        let dataTypeData = e.data.buffer.slice(offset, offset + tlvTypeLength);
        offset += tlvTypeLength;
        let dataType = Array.from(new Uint32Array(dataTypeData));
        let currentLData = e.data.buffer.slice(offset, offset + tlvTypeLength);
        offset += tlvTypeLength;
        let currentVLength = Array.from(new Uint32Array(currentLData));
        offset += currentVLength[0];
        commonDataOffset.endOffset = offset;
        if (dataType[0] === CONTENT_TYPE_CMDLINES || dataType[0] === CONTENT_TYPE_TGIDS) {
          commonTotalLength += commonDataOffset.endOffset - commonDataOffset.startOffset;
          commonDataOffsetList.push(commonDataOffset);
        }
      }
      let frontData = new Uint8Array(headArray.byteLength + commonTotalLength);
      // HeadArray
      frontData.set(headArray, 0);
      let lengthOffset = headArray.byteLength;
      // common Data
      commonDataOffsetList.forEach((item) => {
        let commonData = uint8Array.slice(item.startOffset, item.endOffset);
        frontData.set(commonData, lengthOffset);
        lengthOffset += commonData.byteLength;
      });
      let freeData = uint8Array.slice(12);
      let final = new Uint8Array(frontData.length + freeData.length);
      final.set(frontData);
      final.set(freeData, frontData.length);
      wrSize = 0;
      while (wrSize < final.length) {
        const sliceLen = Math.min(final.length - wrSize, REQ_BUF_SIZE);
        const dataSlice = final.subarray(wrSize, wrSize + sliceLen);
        Module.HEAPU8.set(dataSlice, reqBufferAddr);
        wrSize += sliceLen;
        r2 = Module._TraceStreamerParseDataEx(sliceLen, wrSize === final.length ? 1 : 0);
        if (r2 === -1) {
          break;
        }
      }
    } else {
      while (wrSize < uint8Array.length) {
        const sliceLen = Math.min(uint8Array.length - wrSize, REQ_BUF_SIZE);
        const dataSlice = uint8Array.subarray(wrSize, wrSize + sliceLen);
        Module.HEAPU8.set(dataSlice, reqBufferAddr);
        wrSize += sliceLen;
        r2 = Module._TraceStreamerParseDataEx(sliceLen, wrSize === uint8Array.length ? 1 : 0);
        if (r2 == -1) {
          break;
        }
      }
    }
    Module._TraceStreamerParseDataOver();
    for (let value of thirdWasmMap.values()) {
      value.model._TraceStreamer_In_ParseDataOver();
    }
    if (r2 == -1) {
      // @ts-ignore
      self.postMessage({
        id: e.data.id,
        action: e.data.action,
        init: false,
        msg: 'parse data error',
      });
      return;
    }
    temp_init_sql_list.forEach((item, index) => {
      let r = createView(item);
      // @ts-ignore
      self.postMessage({ id: e.data.id, ready: true, index: index + 1 });
    });
    self.postMessage(
      {
        id: e.data.id,
        action: e.data.action,
        init: true,
        msg: 'ok',
        configSqlMap: thirdJsonResult,
        buffer: e.data.buffer,
        fileKey: ffrtFileCacheKey,
      },
      // @ts-ignore
      [e.data.buffer]
    );
  } else if (e.data.action === 'exec') {
    query(e.data.name, e.data.sql, e.data.params);
    let jsonArray = convertJSON();
    // @ts-ignore
    self.postMessage({
      id: e.data.id,
      action: e.data.action,
      results: jsonArray,
    });
  } else if (e.data.action === 'exec-proto') {
    execProtoForWorker(e.data, (sql: string) => {
      let sqlUintArray = enc.encode(sql);
      if (e.data.params.trafic !== TraficEnum.ProtoBuffer) {
        Module.HEAPU8.set(sqlUintArray, reqBufferAddr);
        Module._TraceStreamerSqlQueryEx(sqlUintArray.length);
        let jsonArray = convertJSON();
        return jsonArray;
      } else {
        let allArray = new Uint8Array(typeLength + sqlUintArray.length);
        allArray[0] = e.data.name;
        allArray.set(sqlUintArray, typeLength);
        Module.HEAPU8.set(allArray, reqBufferAddr);
        Module._TraceStreamerSqlQueryToProtoCallback(allArray.length);
        let finalArrayBuffer = [];
        if (protoDataMap.has(e.data.name)) {
          finalArrayBuffer = protoDataMap.get(e.data.name);
          protoDataMap.delete(e.data.name);
        }
        return finalArrayBuffer;
      }
    });
  } else if (e.data.action == 'exec-buf') {
    query(e.data.name, e.data.sql, e.data.params);
    self.postMessage(
      { id: e.data.id, action: e.data.action, results: arr!.buffer },
      // @ts-ignore
      [arr.buffer]
    );
  } else if (e.data.action.startsWith('exec-sdk')) {
    querySdk(e.data.name, e.data.sql, e.data.params, e.data.action);
    let jsonArray = convertJSON();
    // @ts-ignore
    self.postMessage({
      id: e.data.id,
      action: e.data.action,
      results: jsonArray,
    });
  } else if (e.data.action.startsWith('exec-metric')) {
    queryMetric(e.data.sql);
    let metricResult = dec.decode(arr);
    // @ts-ignore
    self.postMessage({
      id: e.data.id,
      action: e.data.action,
      results: metricResult,
    });
  } else if (e.data.action == 'init-port') {
    let port = e.ports[0];
    port.onmessage = (me) => {
      query(me.data.action, me.data.sql, me.data.params);
      let msg = {
        id: me.data.id,
        action: me.data.action,
        results: arr!.buffer,
      };
      port.postMessage(msg, [arr!.buffer]);
    };
  } else if (e.data.action == 'download-db') {
    let bufferSliceUint: Array<any> = [];
    let mergedUint = () => {
      let length = 0;
      bufferSliceUint.forEach((item) => {
        length += item.length;
      });
      let mergedArray = new Uint8Array(length);
      let offset = 0;
      bufferSliceUint.forEach((item) => {
        mergedArray.set(item, offset);
        offset += item.length;
      });
      return mergedArray;
    };
    let getDownloadDb = (heapPtr: number, size: number, isEnd: number) => {
      let out: Uint8Array = Module.HEAPU8.slice(heapPtr, heapPtr + size);
      bufferSliceUint.push(out);
      if (isEnd == 1) {
        let arr: Uint8Array = mergedUint();
        self.postMessage({
          id: e.data.id,
          action: e.data.action,
          results: arr,
        });
      }
    };
    let fn1 = Module.addFunction(getDownloadDb, 'viii');
    Module._WasmExportDatabase(fn1);
  } else if (e.data.action === 'upload-so') {
    uploadSoActionId = e.data.id;
    let fileList = e.data.params as Array<File>;
    if (fileList) {
      soFileList = fileList;
      uploadFileIndex = 0;
      if (!uploadSoCallbackFn) {
        uploadSoCallbackFn = Module.addFunction(uploadSoCallBack, 'viii');
      }
      uploadSoFile(soFileList[uploadFileIndex]).then();
    }
  } else if (e.data.action === 'cut-file') {
    cutFileByRange(e);
  } else if (e.data.action === 'long_trace') {
    await initWASM();
    let result = {};
    let headArray = e.data.params.headArray;
    let timStamp = e.data.params.timeStamp;
    let allIndexDataList = e.data.params.splitDataList;
    let splitFileInfos = e.data.params.splitFileInfo as Array<{
      fileType: string;
      startIndex: number;
      endIndex: number;
      size: number;
    }>;
    let maxSize = 48 * 1024 * 1024;
    let maxPageNum = headArray.length / 1024;
    let currentPageNum = 0;
    let splitReqBufferAddr: number;
    if (splitFileInfos) {
      let splitFileInfo = splitFileInfos.filter((splitFileInfo) => splitFileInfo.fileType !== 'trace');
      if (splitFileInfo && splitFileInfo.length > 0) {
        let traceFileType: string = '';
        let db = await openDB();
        let newCutFilePageInfo: Map<
          string,
          {
            traceFileType: string;
            dataArray: [{ data: Uint8Array | Array<{ offset: number; size: number }>; dataTypes: string }];
          }
        > = new Map();
        let cutFileCallBack = (heapPtr: number, size: number, dataType: number, isEnd: number) => {
          let key = `${traceFileType}_${currentPageNum}`;
          let out: Uint8Array = Module.HEAPU8.slice(heapPtr, heapPtr + size);
          if (DataTypeEnum.data === dataType) {
            if (traceFileType === 'arkts') {
              arkTsData.push(out);
              arkTsDataSize += size;
            } else {
              if (newCutFilePageInfo.has(key)) {
                let newVar = newCutFilePageInfo.get(key);
                newVar?.dataArray.push({ data: out, dataTypes: 'data' });
              } else {
                newCutFilePageInfo.set(key, {
                  traceFileType: traceFileType,
                  dataArray: [{ data: out, dataTypes: 'data' }],
                });
              }
            }
          } else if (DataTypeEnum.json === dataType) {
            let cutFilePageInfo = newCutFilePageInfo.get(key);
            if (cutFilePageInfo) {
              let jsonStr: string = dec.decode(out);
              let jsonObj = JSON.parse(jsonStr);
              let valueArray: Array<{ offset: number; size: number }> = jsonObj.value;
              cutFilePageInfo.dataArray.push({ data: valueArray, dataTypes: 'json' });
            }
          }
        };
        splitReqBufferAddr = Module._InitializeSplitFile(Module.addFunction(cutFileCallBack, 'viiii'), REQ_BUF_SIZE);
        Module.HEAPU8.set(headArray, splitReqBufferAddr);
        Module._TraceStreamerGetLongTraceTimeSnapEx(headArray.length);
        for (let fileIndex = 0; fileIndex < splitFileInfo.length; fileIndex++) {
          let fileInfo = splitFileInfo[fileIndex];
          traceFileType = fileInfo.fileType;
          for (let pageNum = 0; pageNum < maxPageNum; pageNum++) {
            currentPageNum = pageNum;
            await splitFileAndSave(
              timStamp,
              fileInfo.fileType,
              fileInfo.startIndex,
              fileInfo.endIndex,
              fileInfo.size,
              db,
              pageNum,
              maxSize,
              splitReqBufferAddr
            );
            await initWASM();
            splitReqBufferAddr = Module._InitializeSplitFile(
              Module.addFunction(cutFileCallBack, 'viiii'),
              REQ_BUF_SIZE
            );
            Module.HEAPU8.set(headArray, splitReqBufferAddr);
            Module._TraceStreamerGetLongTraceTimeSnapEx(headArray.length);
          }
        }
        for (const [fileTypePageNum, fileMessage] of newCutFilePageInfo) {
          let fileTypePageNumArr = fileTypePageNum.split('_');
          let fileType = fileTypePageNumArr[0];
          let pageNum = Number(fileTypePageNumArr[1]);
          let saveIndex = 0;
          let saveStartOffset = 0;
          let dataArray = fileMessage.dataArray;
          let currentChunk = new Uint8Array(maxSize);
          let currentChunkOffset = 0;
          for (let fileDataIndex = 0; fileDataIndex < dataArray.length; fileDataIndex++) {
            let receiveData = dataArray[fileDataIndex];
            if (receiveData.dataTypes === 'data') {
              let receiveDataArray = receiveData.data as Uint8Array;
              if (currentChunkOffset + receiveDataArray.length > maxSize) {
                let freeSize = maxSize - currentChunkOffset;
                let freeSaveData = receiveDataArray.slice(0, freeSize);
                currentChunk.set(freeSaveData, currentChunkOffset);
                await addDataToIndexeddb(db, {
                  buf: currentChunk,
                  id: `${fileType}_new_${timStamp}_${pageNum}_${saveIndex}`,
                  fileType: `${fileType}_new`,
                  pageNum: pageNum,
                  startOffset: saveStartOffset,
                  endOffset: saveStartOffset + maxSize,
                  index: saveIndex,
                  timStamp: timStamp,
                });
                saveStartOffset += maxSize;
                saveIndex++;
                currentChunk = new Uint8Array(maxSize);
                let remnantArray = receiveDataArray.slice(freeSize);
                currentChunkOffset = 0;
                currentChunk.set(remnantArray, currentChunkOffset);
                currentChunkOffset += remnantArray.length;
              } else {
                currentChunk.set(receiveDataArray, currentChunkOffset);
                currentChunkOffset += receiveDataArray.length;
              }
            } else {
              if (receiveData.data.length > 0) {
                let needCutMessage = receiveData.data as Array<{ offset: number; size: number }>;
                let startOffset = needCutMessage[0].offset;
                let nowCutInfoList: Array<any> = [];
                let isBeforeCutFinish = false;
                for (let needCutIndex = 0; needCutIndex < needCutMessage.length; needCutIndex++) {
                  let cutInfo = needCutMessage[needCutIndex];
                  if (isBeforeCutFinish) {
                    startOffset = cutInfo.offset;
                    isBeforeCutFinish = false;
                    nowCutInfoList.length = 0;
                  }
                  if (
                    cutInfo.offset + cutInfo.size - startOffset >= maxSize * 10 ||
                    needCutIndex === needCutMessage.length - 1
                  ) {
                    nowCutInfoList.push(cutInfo);
                    let nowStartCutOffset = nowCutInfoList[0].offset;
                    let nowEndCutOffset = cutInfo.offset + cutInfo.size;
                    let searchDataInfo = allIndexDataList.filter(
                      (value: {
                        fileType: string;
                        index: number;
                        pageNum: number;
                        startOffsetSize: number;
                        endOffsetSize: number;
                      }) => {
                        return (
                          value.fileType === fileType &&
                          value.startOffsetSize <= nowEndCutOffset &&
                          value.endOffsetSize >= nowStartCutOffset
                        );
                      }
                    );
                    let startIndex = searchDataInfo[0].index;
                    let endIndex = searchDataInfo[searchDataInfo.length - 1].index;
                    let transaction = db.transaction(STORE_NAME, 'readonly');
                    let store = transaction.objectStore(STORE_NAME);
                    let index = store.index('QueryCompleteFile');
                    let range = IDBKeyRange.bound(
                      [timStamp, fileType, 0, startIndex],
                      [timStamp, fileType, 0, endIndex],
                      false,
                      false
                    );
                    const getRequest = index.openCursor(range);
                    let queryAllData = await queryDataFromIndexeddb(getRequest);
                    let mergeData = indexedDataToBufferData(queryAllData);
                    for (let cutOffsetObjIndex = 0; cutOffsetObjIndex < nowCutInfoList.length; cutOffsetObjIndex++) {
                      let cutUseOffsetObj = nowCutInfoList[cutOffsetObjIndex];
                      let endOffset = cutUseOffsetObj.offset + cutUseOffsetObj.size;
                      let sliceData = mergeData.slice(
                        cutUseOffsetObj.offset - searchDataInfo[0].startOffsetSize,
                        endOffset - searchDataInfo[0].startOffsetSize
                      );
                      let sliceDataLength = sliceData.length;
                      if (currentChunkOffset + sliceDataLength >= maxSize) {
                        let handleCurrentData = new Uint8Array(currentChunkOffset + sliceDataLength);
                        let freeSaveArray = currentChunk.slice(0, currentChunkOffset);
                        handleCurrentData.set(freeSaveArray, 0);
                        handleCurrentData.set(sliceData, freeSaveArray.length);
                        let newSliceDataLength: number = Math.ceil(handleCurrentData.length / maxSize);
                        for (let newSliceIndex = 0; newSliceIndex < newSliceDataLength; newSliceIndex++) {
                          let newSliceSize = newSliceIndex * maxSize;
                          let number = Math.min(newSliceSize + maxSize, handleCurrentData.length);
                          let saveArray = handleCurrentData.slice(newSliceSize, number);
                          if (newSliceIndex === newSliceDataLength - 1 && number - newSliceSize < maxSize) {
                            currentChunk = new Uint8Array(maxSize);
                            currentChunkOffset = 0;
                            currentChunk.set(saveArray, currentChunkOffset);
                            currentChunkOffset += saveArray.length;
                          } else {
                            await addDataToIndexeddb(db, {
                              buf: saveArray,
                              id: `${fileType}_new_${timStamp}_${pageNum}_${saveIndex}`,
                              fileType: `${fileType}_new`,
                              pageNum: pageNum,
                              startOffset: saveStartOffset,
                              endOffset: saveStartOffset + maxSize,
                              index: saveIndex,
                              timStamp: timStamp,
                            });
                            saveStartOffset += maxSize;
                            saveIndex++;
                          }
                        }
                      } else {
                        currentChunk.set(sliceData, currentChunkOffset);
                        currentChunkOffset += sliceDataLength;
                      }
                    }
                    isBeforeCutFinish = true;
                  } else {
                    nowCutInfoList.push(cutInfo);
                  }
                }
              }
            }
          }
          if (currentChunkOffset !== 0) {
            let freeArray = currentChunk.slice(0, currentChunkOffset);
            await addDataToIndexeddb(db, {
              buf: freeArray,
              id: `${fileType}_new_${timStamp}_${pageNum}_${saveIndex}`,
              fileType: `${fileType}_new`,
              pageNum: pageNum,
              startOffset: saveStartOffset,
              endOffset: saveStartOffset + maxSize,
              index: saveIndex,
              timStamp: timStamp,
            });
            saveStartOffset += maxSize;
            saveIndex++;
          }
        }
      }
    }
    self.postMessage({
      id: e.data.id,
      action: e.data.action,
      results: result,
    });
    return;
  }
};
