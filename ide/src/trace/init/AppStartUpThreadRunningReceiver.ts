import { Args } from './CommonArgs';
import { filterDataByGroup } from './utils/DataFilter';
import { TraficEnum, threadStateToNumber } from './utils/QueryEnum';
import { appstartUpThreadRunningList } from './utils/AllMemoryCache';
export const runningSegSplicSql = (args: Args, params: Args) => {
	return `SELECT
        B.cpu,
        B.dur AS originalDur,
      CASE
          WHEN B.ts + IFNULL( B.dur, 0 ) > ( ${args.startTs} + ${args.dur} + ${params.recordStartNS} ) THEN
          ( ${args.startTs} + ${args.dur} + ${params.recordStartNS} - B.ts ) 
          WHEN B.ts < (${args.startTs} + ${params.recordStartNS}) THEN
          B.dur + B.ts - (${args.startTs} + ${params.recordStartNS}) ELSE B.dur 
        END AS dur,
        B.itid AS id,
        B.tid AS tid,
        B.state,
        B.pid,
      CASE
          WHEN B.ts < ( ${args.startTs} + ${params.recordStartNS} ) THEN
          ${args.startTs} ELSE B.ts - ${params.recordStartNS} 
        END AS startTs,
        ifnull( B.arg_setid, - 1 ) AS argSetId,
        '${args.startName}' AS startName
      FROM
        thread_state AS B 
      WHERE
        B.tid = ${args.tid} 
        AND B.pid = ${args.pid} 
        AND B.state = 'Running' 
        AND NOT (
          ( B.ts + ifnull( B.dur, 0 ) < ( ${args.startTs}  + ${params.recordStartNS} ) ) 
        OR ( B.ts > ( ${args.startTs} + ${args.dur} + ${params.recordStartNS} ) ) 
        )
    `
}
export function appStartupThreadRunningReceiver(data: unknown, proc: Function): void {
	//@ts-ignore
	if (data.params.trafic === TraficEnum.Memory) {
		let array: unknown = [];
		//@ts-ignore
		data.params.list.forEach((item) => {
			//@ts-ignore
			let key = `${item.pid}-${item.tid}-${item.startTs}`;
			if (!appstartUpThreadRunningList.has(key)) {
				//@ts-ignore
				appstartUpThreadRunningList.set(key, proc(runningSegSplicSql(item, data.params)));
			}
			let arr = appstartUpThreadRunningList.get(key) || [];
			//@ts-ignore
			array.push(...arr)
		})
		//@ts-ignore
		let res = filterDataByGroup(
			//@ts-ignore
			array,
			'startTs',
			'dur', //@ts-ignore
			data.params.startNS, //@ts-ignore
			data.params.endNS, //@ts-ignore
			data.params.width,
			undefined,
			//@ts-ignore
			(a) => a.state === 'Running',
			false
		);
		//@ts-ignore
		arrayBufferHandler(data, res, true, array.length === 0);
	}
	return;
}
function arrayBufferHandler(data: unknown, res: unknown[], transfer: boolean, isEmpty: boolean): void {
	//@ts-ignore
	let startTs = new Float64Array(transfer ? res.length : data.params.sharedArrayBuffers.startTs); //@ts-ignore
	let dur = new Float64Array(transfer ? res.length : data.params.sharedArrayBuffers.dur); //@ts-ignore
	let cpu = new Int8Array(transfer ? res.length : data.params.sharedArrayBuffers.cpu); //@ts-ignore
	let id = new Int32Array(transfer ? res.length : data.params.sharedArrayBuffers.id); //@ts-ignore
	let tid = new Int32Array(transfer ? res.length : data.params.sharedArrayBuffers.tid); //@ts-ignore
	let state = new Int32Array(transfer ? res.length : data.params.sharedArrayBuffers.state); //@ts-ignore
	let pid = new Int32Array(transfer ? res.length : data.params.sharedArrayBuffers.pid); //@ts-ignore
	let startName = new Int32Array(transfer ? res.length : data.params.sharedArrayBuffers.startName);//@ts-ignore
	let argSetID = new Int32Array(transfer ? res.length : data.params.sharedArrayBuffers.argSetID);
	res.forEach((it, i) => {
		//@ts-ignore
		data.params.trafic === TraficEnum.ProtoBuffer && (it = it.processThreadData); //@ts-ignore
		startTs[i] = it.startTs; //@ts-ignore
		dur[i] = it.dur; //@ts-ignore
		cpu[i] = it.cpu; //@ts-ignore
		id[i] = it.id; //@ts-ignore
		tid[i] = it.tid; //@ts-ignore
		state[i] = threadStateToNumber(it.state); //@ts-ignore
		pid[i] = it.pid; //@ts-ignore
		startName[i] = it.startName; //@ts-ignore
		argSetID[i] = it.argSetId;
	});
	(self as unknown as Worker).postMessage(
		{
			//@ts-ignore
			id: data.id, //@ts-ignore
			action: data.action,
			results: transfer
				? {
					id: id.buffer,
					tid: tid.buffer,
					state: state.buffer,
					startTs: startTs.buffer,
					dur: dur.buffer,
					cpu: cpu.buffer,
					pid: pid.buffer,
					startName: startName.buffer,
					argSetID: argSetID.buffer,
				}
				: {},
			len: res.length,
			transfer: transfer,
			isEmpty: isEmpty,
		},
		transfer
			? [startTs.buffer,
			dur.buffer,
			cpu.buffer,
			id.buffer,
			tid.buffer,
			state.buffer,
			pid.buffer,
			startName.buffer,
			argSetID.buffer]
			: []
	);
}