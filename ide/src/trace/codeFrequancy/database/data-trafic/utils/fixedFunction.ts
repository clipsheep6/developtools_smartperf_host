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
  let result: Set<any> = new Set();
  let arr: any[] = [];
  // 标志位，判定何时进行新一轮数据统计处理
  let flag: number = -1;
  // 每组数据中最大的durKey值
  let durMax: number = -1;
  // 每组数据中最大的valueKey值
  let valueMax: number = -1;
  // 最大durKey值对应的数组角标
  let durIndex: number = -1;
  // 最大valueKey值对应的数组角标
  let valueIndex: number = -1;
  for (let i = 0; i < list.length; i++) {
    // 筛选符合判断条件的数据，作进一步处理
    if (list[i][startKey] + list[i][durKey] >= startNS && list[i][startKey] <= endNS) {
      // 获取当前数据的像素值
      const px: number = Math.floor(list[i][startKey] / ((endNS - startNS) / width));
      list[i].px = px;
      // 将新的像素值与上一次记录的值作比较，若不等，证明该组数据已全，进行填值处理。并将flag值置为当前像素值,并清空临时数组
      if (flag !== px) {
        flag = px;
        if (arr.length > 0) {
          // 此处无需判定durIndex === valueIndex，只需顺序添加即可，Set对象会自动去重
          result.add(list[durIndex]);
          // valueIndex不一定大于零，所以需要增加判断
          valueIndex >= 0 && result.add(list[valueIndex]);
          // 增加filter传参函数执行
          if (filter) {
            let filterArr = arr.filter(a => filter(a));
            if (filterArr && filterArr.length > 0) {
              result.add(filterArr.reduce((p, c) => (p[durKey] > c[durKey]) ? p : c));
            }
          }
          // 清空临时数组，以便记录下次px值的数组元素
          arr = [];
          durMax = -1;
          valueMax = -1;
        }
      }
      // 若像素值相等，则添加临时数组，并记录每次填值时最大dur和最大value值的角标
      if (flag === px) {
        arr.push(list[i]);
        if (list[i][durKey] > durMax) {
          durMax = list[i][durKey];
          durIndex = i;
        }
        if (valueKey && list[i][valueKey] > valueMax) {
          valueMax = list[i][valueKey];
          valueIndex = i;
        }
        // 需要对最后一组数据做立即处理
        if (i === list.length - 1) {
          // 此处无需判定durIndex === valueIndex，只需顺序添加即可，Set对象会自动去重
          result.add(list[durIndex]);
          // valueIndex不一定大于零，所以需要增加判断
          valueIndex >= 0 && result.add(list[valueIndex]);
        }
      }
    }
  }
  return [...result];
}


export function func1(
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
