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
import { info } from '../../log/Log.js';
import { DbPool } from "./SqlLite.js";

export function initIndexedDB() : Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    let request = indexedDB.open('smart_perf',2);
    request.onerror = function (event) {};
    request.onsuccess = function (event) {
      let db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = function (event) {
      // @ts-ignore
      let db = event!.target!.result;
      if (db.objectStoreNames.contains("trace_file")) {
        db.deleteObjectStore('trace_file');
      }
      let objectStore = db.createObjectStore('trace_file',{keyPath: 'file_index'});
      objectStore.createIndex('file_id','file_id');
      objectStore.createIndex('file_buffer','file_buffer');
    };
  });
}

export function cacheTraceFileBuffer(db: IDBDatabase,fileId: string, buffer: ArrayBuffer){
  if (db) {
    let objectStore = db.transaction(['trace_file'],'readwrite').objectStore('trace_file');
    let request = objectStore.getAll();
    request.onsuccess = function (event) {
      for (let re of request.result) {
        objectStore.delete(re.file_index);
      }
      info("delete file success");
      let size = buffer.byteLength;
      let index = 0;
      while (index < size) {
        let sliceLen = Math.min(size - index, 4 * 1024 * 1024);
        objectStore.add({
          file_index: index,
          file_id: fileId,
          file_buffer: buffer.slice(index,index + sliceLen),
        })
        index += sliceLen;
      }
      info("cache file success",fileId,buffer.byteLength);
      db.close();
    }
    request.onerror = function (ev) {
      info("delete error",fileId);
      db.close();
    }
    request.onerror = function (ev) {
    }
  }
}

export function getTraceFileBuffer(fileId: string) : Promise<ArrayBuffer | null> {
  return new Promise(resolve => {
    resolve(DbPool.sharedBuffer);
    // initIndexedDB().then(db => {
    //   if (db) {
    //     let request = db
    //       .transaction(['trace_file'],'readwrite')
    //       .objectStore('trace_file')
    //       .index('file_id')
    //       .getAll(fileId);
    //     request.onsuccess = function (ev) {
    //       let totalLen = 0;
    //       for (let re of request.result) {
    //         totalLen += re.file_buffer.byteLength;
    //       }
    //       let buffer = new Uint8Array(totalLen);
    //       for (let i = 0; i < request.result.length; i++) {
    //         let re = request.result[i];
    //         buffer.set(re.file_buffer,i === 0 ? 0 : request.result[i - 1].file_buffer.byteLength);
    //       }
    //       resolve(buffer);
    //     }
    //   }
    })
  // });
}