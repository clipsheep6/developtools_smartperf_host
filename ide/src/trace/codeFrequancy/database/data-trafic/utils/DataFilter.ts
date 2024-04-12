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
export function filterData(
  list: any[],
  startKey: string,
  durKey: string,
  startNS: number,
  endNS: number,
  width: number
): any[] {
  let pns = (endNS - startNS) / width; //每个像素多少ns
  let slice = findRange(list, {startKey, durKey, startNS, endNS});
  let sum = 0;
  for (let i = 0; i < slice.length; i++) {
    if (i === slice.length - 1) {
      if (slice[i][durKey] === undefined || slice[i][durKey] === null) {
        slice[i][durKey] = (endNS || 0) - (slice[i][startKey] || 0);
      }
    } else {
      if (slice[i][durKey] === undefined || slice[i][durKey] === null) {
        slice[i][durKey] = (slice[i + 1][startKey] || 0) - (slice[i][startKey] || 0);
      }
    }
    if (slice[i][durKey] >= pns || slice.length < 100) {
      slice[i].v = true;
    } else {
      if (i > 0) {
        let c = slice[i][startKey] - slice[i - 1][startKey] - slice[i - 1][durKey];
        if (c < pns && sum < pns) {
          sum += c + slice[i - 1][durKey];
          slice[i].v = false;
        } else {
          slice[i].v = true;
          sum = 0;
        }
      }
    }
  }
  return slice.filter((it) => it.v);
}

export function filterDataByLayer(
  list: any[],
  layerKey: string,
  startKey: string,
  durKey: string,
  startNS: number,
  endNS: number,
  width: number
): any[] {
  let pns = (endNS - startNS) / width; //每个像素多少ns
  let sliceArray = findRange(list, {startKey, durKey, startNS, endNS});
  let groups = groupBy(sliceArray, layerKey);
  let res: any[] = [];
  Reflect.ownKeys(groups).map((key: any) => {
    let slice = groups[key] as any[];
    if (slice.length > 0) {
      let sum = 0;
      for (let i = 0; i < slice.length; i++) {
        if (i === slice.length - 1) {
          if (slice[i][durKey] === undefined || slice[i][durKey] === null) {
            slice[i][durKey] = (endNS || 0) - (slice[i][startKey] || 0);
          }
        } else {
          if (slice[i][durKey] === undefined || slice[i][durKey] === null) {
            slice[i][durKey] = (slice[i + 1][startKey] || 0) - (slice[i][startKey] || 0);
          }
        }
        if (slice[i][durKey] >= pns || slice.length < 100) {
          slice[i].v = true;
        } else {
          if (i > 0) {
            let c = slice[i][startKey] - slice[i - 1][startKey] - slice[i - 1][durKey];
            if (c < pns && sum < pns) {
              sum += c + slice[i - 1][durKey];
              slice[i].v = false;
            } else {
              slice[i].v = true;
              sum = 0;
            }
          }
        }
      }
      res.push(...slice.filter((it) => it.v));
    }
  });
  return res;
}

export function filterDataByGroup(
  list: any[],
  startKey: string,
  durKey: string,
  startNS: number,
  endNS: number,
  width: number,
  valueKey?: string,
  filter?: (a: any) => boolean): any[] {
  // 筛选符合条件的数据，保证其中每一项的结束时间比trace文件的起始时间大，且开始时间比trace文件的结束时间小的数据
  let arr = findRange(list, {startKey, durKey, startNS, endNS})
  arr = arr.map((it) => {
    // (endNS - startNS) / width结果为当前屏宽下,单位像素占据的屏幕横向像素值
    // 以其开始时间除以单位时间像素值，取整得出其数据的起始像素
    it.px = Math.floor(it[startKey] / ((endNS - startNS) / width));
    return it;
  });
  // 整理成对象，键为arr数组中每一项的px值，值为数组(arr中每一项的px值若等于group的键，则会将该项push到其键对应的数组中)
  let group = groupBy(arr, 'px');
  let res: Set<any> = new Set();
  // Reflect.ownKeys(group)将group的键转成数组去循环
  Reflect.ownKeys(group).map((key: any): void => {
    // 将每组数据进行处理，取出相同px值中的dur最大的那一个数据，作为该像素值下的显示数据
    let arr = group[key] as any[];
    if (arr.length > 0) {
      res.add(arr.reduce((p, c) => (p[durKey] > c[durKey]) ? p : c));
      if (valueKey) {
        res.add(arr.reduce((p, c) => (p[valueKey] > c[valueKey]) ? p : c));
      }
      if (filter) {
        let filterArr = arr.filter(a => filter(a));
        if (filterArr && filterArr.length > 0) {
          res.add(filterArr.reduce((p, c) => (p[durKey] > c[durKey]) ? p : c));
        }
      }
    }
  });
  // 扩展运算符进行去重解构操作成数组
  return [...res];
}

export function filterDataByGroupLayer(
  list: any[],
  layerKey: string,
  startKey: string,
  durKey: string,
  startNS: number,
  endNS: number,
  width: number
): any[] {
  let arr = findRange(list, {startKey, durKey, startNS, endNS});
  arr = arr.map((it) => {
    it.px = Math.floor(it[startKey] / ((endNS - startNS) / width) + it[layerKey] * width);
    //设置临时变量durTmp 用于参与计算，分组后有dur为-1的数据按最长宽度显示
    it.durTmp = (it[durKey] === -1 || it[durKey] === null || it[durKey] === undefined) ? (endNS - it[startKey]) : it[durKey];
    return it;
  });
  let group = groupBy(arr, 'px');
  let res: any[] = [];
  Reflect.ownKeys(group).map((key: any) => {
    let childArray = (group[key] as any[]).reduce((p, c) => (p.durTmp > c.durTmp) ? p : c);
    res.push(childArray);
  });
  return res;
}

function groupBy(array: Array<any>, key: string): any {
  return array.reduce((pre, current, index, arr) => {
    // 按照key属性值进行分组整理成对象
    (pre[current[key]] = pre[current[key]] || []).push(current);
    return pre;
  }, {});
}

function findRange(
  fullData: Array<any>,
  condition: {
    startKey: string;
    startNS: number;
    durKey: string;
    endNS: number;
  }
): Array<any> {
  // 筛选出当前数据中满足每一项的开始时间 + dur > trace文件的起始时间0的 且 开始时间 < trace文件结束时间的数据
  return fullData.filter(it => it[condition.startKey] + it[condition.durKey] >= condition.startNS && it[condition.startKey] <= condition.endNS);
}

export function func(
  list: any[],
  startKey: string,
  durKey: string,
  startNS: number,
  endNS: number,
  width: number,
  valueKey?: string,
  filter?: (a: any) => boolean
) {
  let arr: any[] = [];
  // 标志位，判定何时进行新一轮数据统计处理
  let flag: number = -1;
  for (let i = 0; i < list.length; i++) {
    // 筛选符合判断条件的数据，作进一步处理
    if (list[i][startKey] + list[i][durKey] >= startNS && list[i][startKey] <= endNS) {
      // 获取当前数据的像素值
      const px: number = Math.floor(list[i][startKey] / ((endNS - startNS) / width));
      list[i].px = px;
      if (flag === px && list[i][durKey] > arr[arr.length - 1][durKey]) {
        arr[arr.length - 1] = list[i];
      }
      if (flag !== px) {
        flag = px;
        arr.push(list[i]);
      }
    }
  }
  return arr;
}