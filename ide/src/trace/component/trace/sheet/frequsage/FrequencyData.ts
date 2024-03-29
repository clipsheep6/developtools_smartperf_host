/*
 * Copyright (C) 2024 Huawei Device Co., Ltd.
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
import { type CpuFreqData, type RunningFreqData, type RunningData } from './TabPaneFreqUsageConfig';

// 遗留问题 算力消耗转换值问题，需从json文件中拿到用户提供算力值
self.addEventListener("message", function (event) {
  let runningData: Array<RunningData> = event.data.runningResult;
  let cpuFreqData: Array<CpuFreqData> = event.data.cpuFreqData;
  const LEFT_TIME: number = event.data.LEFT_TIME;
  const RIGHT_TIME: number = event.data.RIGHT_TIME;
  let result: Array<RunningFreqData> = dealRun(runningData, cpuFreqData, LEFT_TIME, RIGHT_TIME);
  self.postMessage(result);
});

/**
 * 
 * @param runningResult running状态数据
 * @param cpuFreqData cpu频点数据
 * @param leftNs 左边界时间
 * @param rightNs 右边界时间
 * @returns 整理好的需要展示的数据
 */
function dealRun(runningResult: Array<RunningData>, cpuFreqData: Array<CpuFreqData>, leftNs: number, rightNs: number): Array<RunningFreqData> {
  let sum: number = 0;
  for (let i = 0; i < runningResult.length; i++) {
    // 整理左右边界数据问题, 因为涉及多线程，所以必须放在循环里
    if (runningResult[i].ts < leftNs && runningResult[i].ts + runningResult[i].dur > leftNs) {
      runningResult[i].dur = runningResult[i].ts + runningResult[i].dur - leftNs;
      runningResult[i].ts = leftNs;
    }
    if (runningResult[i].ts + runningResult[i].dur > rightNs) {
      runningResult[i].dur = rightNs - runningResult[i].ts;
    }
    sum += runningResult[i].dur;
  }
  let result: Array<RunningFreqData> = dealData(runningResult, cpuFreqData, sum);
  let resultArr: Array<RunningFreqData> = translateTree(result);
  return resultArr;
}

/**
 * 
 * @param runningResult running状态数据
 * @param cpuFreqData cpu频点数据
 * @param sum running状态数据持续时间总和
 * @returns running状态频点数据
 */
function dealData(runningResult: Array<RunningData>, cpuFreqData: Array<CpuFreqData>, sum: number): Array<RunningFreqData> {
  let result: Array<RunningFreqData> = [];
  let flag: number;
  for (let i = 0; i < cpuFreqData.length; i++) {
    for (let j = 0; j < runningResult.length; j++) {
      if (cpuFreqData[i].cpu === runningResult[j].cpu) {
        if (cpuFreqData[i].ts < runningResult[j].ts) {
          // running数据完全包含在当前频点持续时间范围内，push完即可删除掉
          if (cpuFreqData[i].ts + cpuFreqData[i].dur > runningResult[j].ts + runningResult[j].dur) {
            result.push(returnObj(runningResult[j], cpuFreqData[i], sum, flag = 1)!);
            runningResult.splice(j, 1);
            j--;
          } else {
            // running数据前面一部分包含在当前频点持续范围内
            if (cpuFreqData[i].ts + cpuFreqData[i].dur > runningResult[j].ts) {
              result.push(returnObj(runningResult[j], cpuFreqData[i], sum, flag = 2)!);
            }
          }
        } else {
          if (runningResult[j].ts + runningResult[j].dur > cpuFreqData[i].ts) {
            // running数据中间部分包含在当前频点持续时间范围内
            if (runningResult[j].ts + runningResult[j].dur > cpuFreqData[i].ts + cpuFreqData[i].dur) {
              result.push(returnObj(runningResult[j], cpuFreqData[i], sum, flag = 3)!);
            } else {
              // running数据后半部分包含在当前频点持续时间范围内，push完即可删除掉
              result.push(returnObj(runningResult[j], cpuFreqData[i], sum, flag = 4)!);
              runningResult.splice(j, 1);
              j--;
            }
          }else {
            // running数据完全运行在频点数据之前，push完即可删除掉
            result.push(returnObj(runningResult[j], cpuFreqData[i], sum, flag = 5)!);
            runningResult.splice(j, 1);
            j--;
          }
        }
      }
    }
  }
  return result;
}

/**
 * 
 * @param item running数据
 * @param cpuFreqData 频点数据
 * @param sum running总和
 * @param flag 标志位，根据不同值返回不同结果
 * @returns 返回新的对象
 */
function returnObj(runningResult: RunningData, cpuFreqData: CpuFreqData, sum: number, flag: number): RunningFreqData | undefined {
  const PERCENT: number = 100;
  switch (flag) {
    case 1:
      return {
        'thread': runningResult.pid + '_' + runningResult.tid,
        'consumption': cpuFreqData.value * runningResult.dur, 
        'cpu': runningResult.cpu, 
        'frequency': cpuFreqData.value, 
        'dur': runningResult.dur, 
        'percent': runningResult.dur / sum * PERCENT
      };
    case 2:
      return {
        'thread': runningResult.pid + '_' + runningResult.tid,
        'consumption': cpuFreqData.value * (cpuFreqData.ts + cpuFreqData.dur - runningResult.ts), 
        'cpu': runningResult.cpu, 
        'frequency': cpuFreqData.value, 
        'dur': cpuFreqData.ts + cpuFreqData.dur - runningResult.ts, 
        'percent': (cpuFreqData.ts + cpuFreqData.dur - runningResult.ts) / sum * PERCENT
      };
    case 3:
      return {
        'thread': runningResult.pid + '_' + runningResult.tid,
        'consumption': cpuFreqData.value * cpuFreqData.dur, 
        'cpu': runningResult.cpu, 
        'frequency': cpuFreqData.value, 
        'dur': cpuFreqData.dur, 
        'percent': cpuFreqData.dur / sum * PERCENT
      };
    case 4: 
      return {
        'thread': runningResult.pid + '_' + runningResult.tid,
        'consumption': cpuFreqData.value * (runningResult.ts + runningResult.dur - cpuFreqData.ts), 
        'cpu': runningResult.cpu, 
        'frequency': cpuFreqData.value, 
        'dur': runningResult.ts + runningResult.dur - cpuFreqData.ts, 
        'percent': (runningResult.ts + runningResult.dur - cpuFreqData.ts) / sum * PERCENT
      };
    case 5: 
      return {
        'thread': runningResult.pid + '_' + runningResult.tid,
        'consumption': 0, 
        'cpu': runningResult.cpu, 
        'frequency': 'unknown', 
        'dur': runningResult.dur, 
        'percent': runningResult.dur / sum * PERCENT
      };
  }
}

/**
 * 
 * @param result running状态频点数据
 * @returns 整理好返回主线程的数据
 */
function translateTree(result: Array<RunningFreqData>): Array<RunningFreqData> {
  let runMap: Map<string, Array<RunningFreqData>> = new Map();
  for (let i = 0; i < result.length; i++) {
    const str: string = result[i].thread!;
    if (!runMap.has(str)) {
      runMap.set(str, new Array());
    }
    runMap.get(str)?.push(result[i]);
  }
  runMap.forEach((item, key) => {
    runMap.set(key, mergeSameData(item));
  });
  return translate(runMap);
}

/**
 * 
 * @param resultList 单线程内running数据与cpu频点数据整合成的数组
 */
function mergeSameData(resultList: Array<RunningFreqData>): Array<RunningFreqData> {
  let cpuFreqArr: Array<RunningFreqData> = [];
  let cpuArr: Array<number> = [];
  //合并同一线程内，当运行所在cpu和频点相同时，dur及percent进行累加求和
    for (let i = 0; i < resultList.length; i++) {
      if (!cpuArr.includes(resultList[i].cpu)) {
        cpuArr.push(resultList[i].cpu);
        cpuFreqArr.push(creatNewObj(resultList[i].cpu));
      }
      for (let j = i + 1; j < resultList.length; j++) {
        if (resultList[i].cpu === resultList[j].cpu && resultList[i].frequency === resultList[j].frequency) {
          resultList[i].dur += resultList[j].dur;
          resultList[i].percent += resultList[j].percent;
          resultList[i].consumption += resultList[j].consumption;
          resultList.splice(j, 1);
          j--;
        }
      }
      cpuFreqArr.find(function (item) {
        if (item.cpu === resultList[i].cpu) {
          item.children?.push(resultList[i]);
          item.children?.sort((a, b) => b.consumption - a.consumption);
          item.dur += resultList[i].dur;
          item.percent += resultList[i].percent;
          item.consumption += resultList[i].consumption;
          item.thread = resultList[i].thread;
        }
      });
    }
    cpuFreqArr.sort((a, b) => a.cpu - b.cpu);
    return cpuFreqArr;
}

/**
 * 
 * @param cpu 根据cpu值创建层级结构,cpu < 0为线程、进程层级，其余为cpu层级
 * @returns 
 */
function creatNewObj(cpu: number, flag: boolean = true): RunningFreqData {
  return {
    'thread': flag ? '' : 'P',
    'consumption': 0, 
    'cpu': cpu, 
    'frequency': -1, 
    'dur': 0, 
    'percent': 0,
    children: []
  };
}

/**
 * 
 * @param params cpu层级的数据
 * @returns 整理好的进程级数据
 */
function translate(params: Map<string, Array<RunningFreqData>>): Array<RunningFreqData> {
  let result: Array<RunningFreqData> = [];
  params.forEach((item, key) => {
    let process: RunningFreqData = creatNewObj(-1, false);
    let thread: RunningFreqData = creatNewObj(-2);
    for (let i = 0; i < item.length; i++) {
      thread.children?.push(item[i]);
      thread.dur += item[i].dur;
      thread.percent += item[i].percent;
      thread.consumption += item[i].consumption;
      thread.thread = item[i].thread;
    }
    process.children?.push(thread);
    process.dur += thread.dur;
    process.percent += thread.percent;
    process.consumption += thread.consumption;
    process.thread = process.thread! + key.split('_')[0];
    result.push(process);
  });
  for (let i = 0; i < result.length; i++) {
    for (let j = i + 1; j < result.length; j++) {
      if (result[i].thread === result[j].thread) {
        result[i].children?.push(result[j].children![0]);
        result[i].dur += result[j].dur;
        result[i].percent += result[j].percent;
        result[i].consumption += result[j].consumption;
        result.splice(j, 1);
        j--
      }
    }
  }
  return result;
}

