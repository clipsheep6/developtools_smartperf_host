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

import {convertJSON, LogicHandler} from "./ProcedureLogicWorkerCommon.js";

export class ProcedureLogicWorkerSchedulingAnalysis extends LogicHandler {
    currentEventId: string = ""
    endTs :number = 0;
    startTs :number = 0;
    totalDur :number = 0;
    cpu:number =0;
    freq:number =0;
    cpuFreqMap:Map<number,Array<CpuMeasure>> = new Map<number, Array<CpuMeasure>>();

    handle(data: any): void {
        this.currentEventId = data.id
        if(data.params.endTs){
            this.endTs = data.params.endTs
            this.totalDur = data.params.total
            this.startTs = this.endTs - this.totalDur
        }
        if (data && data.type) {
            switch (data.type) {
                case "scheduling-getCpuUsage":
                    if(data.params.list){
                        let arr = convertJSON(data.params.list) || []
                        self.postMessage({id: data.id, action: data.action, results: arr})
                        arr = [];
                    }else{
                        this.getCpuUsage()
                    }
                    break;
                case "scheduling-CPU Frequency":
                    if(data.params.list){
                        self.postMessage({id: data.id, action: data.action, results: this.computeCpuMeasureDur(convertJSON(data.params.list) || [],"freq")})
                    }else{
                        this.getCpuFrequency()
                    }
                    break;
                case "scheduling-CPU Frequency Thread":
                    if(data.params.list){
                        self.postMessage({id: data.id, action: data.action, results: this.handlerFreqThreadData(convertJSON(data.params.list) || [])})
                    }else{
                        this.cpu = data.params.cpu;
                        this.freq = data.params.freq;
                        this.getThreadStateByCpu(data.params.cpu)
                    }
                    break;
                case "scheduling-CPU Idle":
                    if(data.params.list){
                        self.postMessage({id: data.id, action: data.action, results: this.computeCpuMeasureDur(convertJSON(data.params.list) || [])})
                    }else{
                        this.getCpuIdle()
                    }
                    break;
                case "scheduling-CPU Irq":
                    if(data.params.list){
                        self.postMessage({id: data.id, action: data.action, results: this.computeCpuMeasureDur(convertJSON(data.params.list) || [])})
                    }else{
                        this.getCpuIrq()
                    }
                    break;
                case "scheduling-Thread CpuUsage":
                    if(data.params.list){
                        self.postMessage({id: data.id, action: data.action, results: this.handlerThreadCpuUsageData(convertJSON(data.params.list) || [])})
                    }else{
                        this.queryThreadCpuUsage(data.params.bigCores || [],data.params.midCores || [],data.params.smallCores || [])
                    }
                    break;
                case "scheduling-Thread RunTime":
                    if(data.params.list){
                        self.postMessage({id: data.id, action: data.action, results: convertJSON(data.params.list) || []})
                    }else{
                        this.queryThreadRunTime(data.params.cpuMax)
                    }
                    break;
                case "scheduling-Process ThreadCount":
                    if(data.params.list){
                        self.postMessage({id: data.id, action: data.action, results: convertJSON(data.params.list) || []})
                    }else{
                        this.queryProcessThreadCount()
                    }
                    break;
                case "scheduling-Process SwitchCount":
                    if(data.params.list){
                        self.postMessage({id: data.id, action: data.action, results: convertJSON(data.params.list) || []})
                    }else{
                        this.queryProcessSwitchCount()
                    }
                    break;
                case "scheduling-Thread Freq":
                    if(data.params.list){
                        self.postMessage({id: data.id, action: data.action, results: this.handlerThreadFreqData(convertJSON(data.params.list) || [])})
                    }else{
                        this.queryThreadStateByTid(data.params.tid)
                    }
                    break;
            }
        }
    }

    queryData(queryName: string, sql: string, args: any) {
        self.postMessage({
            id: this.currentEventId,
            type: queryName,
            isQuery: true,
            args: args,
            sql: sql
        })
    }

    getCpuUsage(){
        this.queryData("scheduling-getCpuUsage", `
select cpu,
       sum(case
               when A.ts < B.start_ts
                   then (A.ts - B.start_ts + A.dur)
               when A.ts >= B.start_ts
                   and (A.ts + A.dur) <= B.end_ts
                   then A.dur
               when (A.ts + A.dur) > B.end_ts
                   then (B.end_ts - A.ts) end) / cast(B.end_ts - B.start_ts as float) as usage
from thread_state A,
     trace_range B
where (A.ts - B.start_ts) > 0
  and A.dur > 0
  and (A.ts + A.dur) > B.start_ts
  and cpu is not null
  and A.ts < B.end_ts
group by cpu
order by cpu;
`, {});
    }

    getCpuFrequency(){
        this.queryData("scheduling-CPU Frequency", `
select cpu,value,ts
from measure left join cpu_measure_filter cmf on measure.filter_id = cmf.id
where cmf.name = 'cpu_frequency'
order by cpu,ts;
`, {});
    }

    getThreadStateByCpu(cpu:number){
        let sql = `
select st.tid,
       st.pid,
       dur,
       ts - tr.start_ts as ts,
       ifnull(t.name,'null') tName,
       ifnull(p.name,'null') pName
from thread_state st,trace_range tr
left join thread t on st.tid = t.tid
left join process p on st.pid = p.pid
where cpu not null
  and ts > tr.start_ts
  and ts + st.dur < tr.end_ts
  and cpu = ${cpu}
order by ts;`
        this.queryData("scheduling-CPU Frequency Thread", sql, {});
    }

    getCpuIdle(){
        this.queryData("scheduling-CPU Idle", `
select cpu,value,ts
from measure left join cpu_measure_filter cmf on measure.filter_id = cmf.id
where cmf.name = 'cpu_idle'
order by cpu,ts;
`, {});
    }

    getCpuIrq(){
        this.queryData("scheduling-CPU Irq", `
select callid as cpu,ts,cat as block,name as value
from irq
order by callid,ts;`, {});
    }

    queryThreadCpuUsage(bigCores:number[],midCores:number[],smallCores:number[]){
        let sql = `
select A.pid,A.tid,ifnull(t.name,'null') as tName,ifnull(p.name,'null') as pName,
       sum(A.dur) as total,
       sum(case when A.cpu in (${bigCores.join(",")}) then A.dur else 0 end ) as big,
       sum(case when A.cpu in (${midCores.join(",")}) then A.dur else 0 end ) as mid,
       sum(case when A.cpu in (${smallCores.join(",")}) then A.dur else 0 end ) as small
from thread_state A
    left join thread t on A.itid = t.itid
    left join process p on A.pid = p.pid
where cpu not null
group by A.pid, A.tid,tName,pName;
`;
        this.queryData("scheduling-Thread CpuUsage",sql ,{})
    }

    queryThreadRunTime(cpuMax:number){
        let sql_condition:string = ''
        for (let i = 0; i <= cpuMax; i++) {
            sql_condition = `${sql_condition}
            (sum(case when cpu = ${i} then dur else 0 end) / 1000) cpu${i}${i < cpuMax ? ',':''}`
        }
        let sql = `
        with temp as (
    select (row_number() over (order by max(A.dur) desc)) no,A.tid, A.pid, max(A.dur) maxDuration, ifnull(p.name, 'null') pName, ifnull(t.name, 'null') tName
    from thread_state A
             left join process p on A.pid = p.pid
             left join thread t on A.itid = t.itid
    where cpu not null
    group by A.tid, A.pid, pName, tName
    order by maxDuration desc
    limit 20)
select t.no, t.tName, t.pid, t.pName, t.maxDuration, a.ts timestamp, s.*
from temp t
         left join (
    select tid,
           ${sql_condition}
    from thread_state
    where cpu not null
    group by tid
) s on t.tid = s.tid
         left join thread_state a on t.tid = a.tid and t.maxDuration = a.dur;`
        this.queryData("scheduling-Thread RunTime",sql,{})
    }

    queryProcessThreadCount(){
        this.queryData("scheduling-Process ThreadCount",`
select row_number() over (order by count(tid) desc) NO,count(tid) threadNumber,p.pid,ifnull(p.name,'null') pName
from thread t
left join process p on t.ipid = p.ipid
group by p.pid, p.name
order by threadNumber desc limit 20;`,{})
    }

    queryProcessSwitchCount(){
        this.queryData("scheduling-Process SwitchCount",`
select row_number() over (order by count(a.pid) desc) NO,count(a.pid) as switchCount,a.pid,ifnull(p.name,'null') pName
from thread_state a
    left join process p on a.pid = p.pid
where cpu not null
group by a.pid, pName limit 20;`,{})
    }

    queryThreadStateByTid(tid:number){
        let sql = `
select cpu,dur,ts - tr.start_ts as ts
from thread_state st,trace_range tr
where cpu not null
  and tid = ${tid}
  and ts > tr.start_ts
  and ts + st.dur < tr.end_ts
  order by cpu,ts;`
        this.queryData("scheduling-Thread Freq",sql,{})
    }

    //根据查询的数据，加工出CPU调度分析所需要展示的相关数据
    computeCpuMeasureDur(arr:Array<CpuMeasure>,type?:string){
        //首先计算 每个频点的持续时间，并根据Cpu来分组
        let map:Map<number,Array<CpuMeasure>> = new Map<number, Array<CpuMeasure>>();
        for (let i = 0,len = arr.length; i < len; i++) {
            let ca = arr[i];
            ca.ts = ca.ts - this.startTs
            if(i + 1 < len){
                let next = arr[i+1]
                ca.dur = next.cpu === ca.cpu ? (next.ts - this.startTs) - ca.ts : this.totalDur - ca.ts
            }else{
                ca.dur = this.totalDur - ca.ts;
            }
            if(map.has(ca.cpu)){
                map.get(ca.cpu)!.push(ca)
            }else{
                map.set(ca.cpu,[ca])
            }
        }
        if(type === "freq"){
            this.cpuFreqMap = map;
        }
        //再根据频点值进行分组求和
        let target:Map<number,CpuAnalysis[]> = new Map<number, CpuAnalysis[]>();
        for (let key of map.keys()) {
            let obj = map.get(key)!.reduce((group: any, ca) => {
                const {value} = ca;
                if (group[value]) {
                    group[value].sum = group[value].sum + ca.dur;
                    group[value].min = group[value].min < ca.dur ? group[value].min : ca.dur;
                    group[value].max = group[value].min > ca.dur ? group[value].min : ca.dur;
                    group[value].count = group[value].count + 1;
                    group[value].avg = (group[value].sum / group[value].count).toFixed(2);
                    group[value].ratio = ((group[value].sum / this.totalDur) * 100).toFixed(2);
                } else {
                    group[value] = {
                        cpu: ca.cpu,
                        value: ca.value,
                        sum: ca.dur,
                        min: ca.dur,
                        max: ca.dur,
                        avg: ca.dur,
                        count: 1,
                        ratio: ((ca.dur / this.totalDur) * 100).toFixed(2),
                        block:ca.block
                    };
                }
                return group;
            }, {});
            target.set(key, (Object.values(obj) as CpuAnalysis[]).sort((a,b) => b.sum - a.sum).slice(0,20))
        }
        return target;
    }

    handlerFreqThreadData(arr:FreqThread[]){
        let cpuFreqArr:CpuMeasure[] = (this.cpuFreqMap.get(this.cpu) || []).filter((it) => it.value === this.freq);
        let map:Map<number,{tid:number,tName:string,pid:number,pName:string,dur:number}> = new Map<number, FreqThread>();
        cpuFreqArr.map(it => {
            let freqEndTs = it.ts + it.dur;
            let threads = arr.filter(f => (it.ts >= f.ts && it.ts <= f.ts + f.dur)
                || (it.ts <= f.ts && freqEndTs >= f.ts + f.dur)
                || (freqEndTs > f.ts && freqEndTs <= f.ts + f.dur))
            for (let tf of threads) {
                let tfEndTs = tf.ts + tf.dur;
                let dur = Math.min(tfEndTs,tfEndTs) - Math.max(it.ts,tf.ts);
                if(map.has(tf.tid)){
                    map.get(tf.tid)!.dur = map.get(tf.tid)!.dur + dur;
                }else{
                    map.set(tf.tid,{
                        tid:tf.tid,
                        tName:tf.tName,
                        pid:tf.pid,
                        pName:tf.pName,
                        dur:dur
                    })
                }
            }
        })
        return Array.from(map.values()).sort((a,b) => b.dur -a.dur).slice(0,20)
    }

    //加工Top20线程大中小核占用率数据
    handlerThreadCpuUsageData(arr:Array<ThreadCpuUsage>){
        let sumBig=0,sumMid=0,sumSmall=0;
        for (let obj of arr) {
            sumBig+=obj.big
            sumMid+=obj.mid
            sumSmall+=obj.small
        }
        for (let obj of arr) {
            obj.bigPercent = sumBig === 0 ? "0" : ((obj.big / sumBig) * 100).toFixed(2)
            obj.midPercent = sumMid === 0 ? "0" : ((obj.mid / sumMid) * 100).toFixed(2)
            obj.smallPercent = sumSmall === 0 ? "0" : ((obj.small / sumSmall) * 100).toFixed(2)
        }
        let map :Map<string,Array<ThreadCpuUsage>> = new Map<string, Array<ThreadCpuUsage>>()
        map.set("total",arr.sort((a,b) => b.total - a.total).slice(0,20))
        map.set("big",arr.sort((a,b) => b.big - a.big).slice(0,20))
        map.set("mid",arr.sort((a,b) => b.mid - a.mid).slice(0,20))
        map.set("small",arr.sort((a,b) => b.small - a.small).slice(0,20))
        return map;
    }

    handlerThreadFreqData(arr:{cpu:number,dur:number,ts:number,freqArr:{freq:number,dur:number}[]}[]){
        let sumDur:number = 0;
        arr.map(it => {
            it.freqArr = []
            let itEndTs = it.ts + it.dur;
            let freqArr:CpuMeasure[] = this.cpuFreqMap.get(it.cpu) || []
            let threadFreqArr = freqArr.filter(f => (it.ts >= f.ts && it.ts <= f.ts + f.dur)
                || (it.ts <= f.ts && itEndTs >= f.ts + f.dur)
                || (itEndTs > f.ts && itEndTs <= f.ts + f.dur))
            for (let tf of threadFreqArr) {
                let tfEndTs = tf.ts + tf.dur;
                it.freqArr.push({freq:tf.value as number,dur: Math.min(itEndTs,tfEndTs) - Math.max(it.ts,tf.ts)})
            }
            sumDur += it.dur
            return it;
        });
        let obj:any = arr.reduce((group:any,tf)=>{
            for (let fa of tf.freqArr) {
                const { freq } = fa
                if (group[freq]) {
                    group[freq].freq = fa.freq;
                    group[freq].time = group[freq].time + fa.dur;
                    group[freq].ratio = ((group[freq].time / sumDur) * 100).toFixed(2);
                } else {
                    group[freq] = {
                        freq: fa.freq,
                        time: fa.dur,
                        ratio: ((fa.dur / sumDur) * 100).toFixed(2),
                    };
                }
            }
            return group;
        },{})
        let target: {freq:number,time:number,ratio:string}[] = Object.values(obj);
        return target.sort((a,b) => b.time - a.time).slice(0,20);
    }

}

export class CpuUsage{
    cpu:number = 0
    usage:number = 0
}

export class CpuMeasure{
    cpu:number = 0;
    value:number | string = 0;
    block:string = "";
    ts:number = 0;
    dur:number = 0;
}

export class CpuAnalysis{
    cpu:number = 0;
    value:number= 0;
    sum:number=0;
    min:number = 0;
    max:number =0;
    avg:number =0;
    count:number=0;
    ratio:string = "";
    block:string = "";
}

export class ThreadCpuUsage{
    pid:number = 0;
    pName:string = "";
    tid:number = 0;
    tName:string = "";
    total:number = 0;
    big:number = 0;
    mid:number = 0;
    small:number = 0;
    bigPercent:string = "";
    midPercent:string = "";
    smallPercent:string = "";
}

export class FreqThread{
    pid:number = 0;
    pName:string = "";
    tid:number = 0;
    tName:string = "";
    dur:number = 0;
    ts:number = 0;
    freq:number = 0;
}
