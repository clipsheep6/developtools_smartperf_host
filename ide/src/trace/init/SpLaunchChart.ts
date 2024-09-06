/*
 * Copyright (C) 2024 Shenzhen Kaihong Digital Industry Development Co., Ltd.
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

import { SpSystemTrace } from '../SpSystemTrace';
import { TraceRow } from '../trace/base/TraceRow';
import { BaseStruct } from '../../bean/BaseStruct';
import { Utils } from '../trace/base/Utils';
import { SpAllAppStartupsChart } from '../chart/SpAllAppStartups';
import { FlagsConfig } from '../SpFlags';
import { AppStartupRender, AppStartupStruct } from '../../database/ui-worker/ProcedureWorkerAppStartup';
import { AppStartupRStruct, AppStartupRunningRender } from '../../database/ui-worker/ProcedureWorkerAppStartupR';
import { processStartupDataSender } from '../../database/data-trafic/process/ProcessStartupDataSender';
import { rowThreadHandler } from './SpChartManager';
import { queryThreadAndProcessData } from '../../database/sql/SqlLite.sql';
import { threadDataSender } from '../../database/data-trafic/process/ThreadDataSender';
import { appStartupThreadRuningDataSender } from '../../database/data-trafic/AppStartupThreadRunningSender'
import { ThreadRender, ThreadStruct } from '../../database/ui-worker/ProcedureWorkerThread';
import { FuncRender, FuncStruct } from '../../database/ui-worker/ProcedureWorkerFunc';
import { funcDataSender } from '../../database/data-trafic/process/FuncDataSender';
import { getMaxDepthByTid } from '../../database/sql/Func.sql';
const FOLD_HEIGHT = 24;
/// Hangs聚合泳道
export class SpLaunchChart {
	private trace: SpSystemTrace;
	private startUpDetailsList: AppStartupStruct[] = []
	static funcNameMap: Map<number | string, string> = new Map();
	private threadFuncMaxDepthMap: Map<string, number> = new Map();

	constructor(trace: SpSystemTrace) {
		this.trace = trace;
	}

	async init(): Promise<void> {
		let isLoadAppStartup: boolean = FlagsConfig.getFlagsConfigEnableStatus('AppStartup');
		this.threadFuncMaxDepthMap.clear();
		if (isLoadAppStartup && SpAllAppStartupsChart.allAppStartupsAva.length) {
			let threadFuncMaxDepthArray = await getMaxDepthByTid();
			threadFuncMaxDepthArray.forEach((it) => {
				//@ts-ignore
				this.threadFuncMaxDepthMap.set(`${it.ipid}-${it.tid}`, it.maxDepth);
			});
			let folder = await this.initFolder(SpAllAppStartupsChart.allAppStartupsAva);
			//初始化Running Cpu Core泳道

			let itidArr: number[] = [...new Set(this.startUpDetailsList.filter(it => it.dur! > 0).map(item => item.itid!))];
			//查找启动阶段分别对应的的进程线程信息
			let res = await queryThreadAndProcessData(itidArr);
			//按顺序初始化，需按照启动顺序排序
			res.sort((a, b) => {
				//@ts-ignore
				return itidArr.indexOf(a.itid) - itidArr.indexOf(b.itid);
			})
			//添加对应的阶段开始时间和持续时间
			let list: Array<ListStruct> = [];
			for (let i = 0; i < this.startUpDetailsList.length; i++) {
				const item = this.startUpDetailsList[i];
				if (item.startTs! < 0) {
					continue;
				}
				//@ts-ignore
				let index = res.findIndex(it => it.itid === item.itid);
				if (index !== -1) {
					list.push({
						startTs: item.startTs,
						dur: item.dur,
						startName: item.startName,
						//@ts-ignore
						pid: res[index].pid,
						//@ts-ignore
						tid: res[index].tid
					})
				}
			}
			this.initRunningCpuCoreRow(folder, list);
			console.log(res);
			//初始化关联的线程及方法泳道
			this.initThreadRow(folder, res)
		}
	}


	async initFolder(ids: number[]): Promise<TraceRow<BaseStruct>> {
		let launchFolder: TraceRow<AppStartupStruct> = TraceRow.skeleton<AppStartupStruct>();
		launchFolder.setAttribute('hasStartup', 'true');
		launchFolder.rowId = `launch`;
		launchFolder.index = 0;
		launchFolder.rowType = TraceRow.ROW_TYPE_LAUNCH;
		launchFolder.rowParentId = '';
		launchFolder.folder = true;
		launchFolder.style.height = '40px';
		launchFolder.name = 'Launch';
		// launchFolder.addTemplateTypes('AppStartup');
		launchFolder.selectChangeHandler = this.trace.selectChangeHandler;
		launchFolder.favoriteChangeHandler = this.trace.favoriteChangeHandler;
		this.startUpDetailsList = await this.getAllAppStartUpList(launchFolder, ids);
		console.log(this.startUpDetailsList);

		launchFolder.supplierFrame = (): Promise<Array<AppStartupStruct>> => new Promise((resolve) => resolve(this.startUpDetailsList!));
		launchFolder.onThreadHandler = rowThreadHandler<AppStartupRender>(
			'app-start-up',
			'appStartupContext',
			{
				type: `app-startup ${launchFolder.rowId}`,
			},
			launchFolder,
			this.trace
		);
		SpAllAppStartupsChart.trace.rowsEL?.appendChild(launchFolder);
		return launchFolder;
	}
	initRunningCpuCoreRow(pRow: TraceRow<BaseStruct>, list: Array<ListStruct>) {
		//初始化线程
		let cRow = TraceRow.skeleton<AppStartupRStruct>();
		cRow.rowId = 'running-cpu-core';
		cRow.rowType = TraceRow.ROW_TYPE_THREAD;
		cRow.rowParentId = `${pRow.rowId}`;
		cRow.rowHidden = !pRow.expansion;
		// cRow.protoPid = thread.tid;
		cRow.style.height = '40px';
		cRow.style.width = '100%';
		cRow.name = 'Running CPU Core';
		cRow.setAttribute('children', '');
		cRow.favoriteChangeHandler = this.trace.favoriteChangeHandler;
		cRow.selectChangeHandler = this.trace.selectChangeHandler;
		cRow.focusHandler = (): void => {
      this.trace?.displayTip(
        cRow,
        AppStartupRStruct.hoverStartupStruct,
        `<span>CPU${AppStartupRStruct.hoverStartupStruct?.cpu} </span>
				<span>Process：${AppStartupRStruct.hoverStartupStruct?.processName || 'Process'} [${AppStartupRStruct.hoverStartupStruct?.pid
        }]</span><span>Thread：${AppStartupRStruct.hoverStartupStruct?.threadName} [${AppStartupRStruct.hoverStartupStruct?.tid}]
        </span><span>Period：${AppStartupRStruct.hoverStartupStruct?.startupName}</span>
				`
      );
    };
		cRow.findHoverStruct = (): void => {
      AppStartupRStruct.hoverStartupStruct = cRow.getHoverStruct();
    };
		cRow.supplierFrame = async (): Promise<Array<AppStartupRStruct>> => {
			let contentArray: Array<AppStartupRStruct> = [];
			//@ts-ignore
			if (list.length > 0) {
				const res = await appStartupThreadRuningDataSender(list , cRow);
				if (res === true) {
					return [];
				}
				contentArray = res as AppStartupRStruct[];
				if (contentArray.length <= 0 && !cRow.isComplete) {
					this.trace.refreshCanvas(true);
				}
				contentArray.forEach((it): void => {
					let p = Utils.getInstance().getProcessMap().get(it.pid!);
					let t = Utils.getInstance().getThreadMap().get(it.tid!);
					let startupName = AppStartupStruct.getStartupName(it.startName);
					it.processName = p;
					it.threadName = t;
					it.startupName = startupName;
				});
			}
			return contentArray;
		};
		cRow.onThreadHandler = rowThreadHandler<AppStartupRunningRender>(
			'app-start-up-running',
			'appStartupContext',
			{
				type: `thread ${cRow.rowId}`,
				translateY: cRow.translateY,
			},
			cRow,
			this.trace
		);
		pRow.addChildTraceRow(cRow);
	}
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
	async getAllAppStartUpList(row: TraceRow<AppStartupStruct>, ids: number[]): Promise<Array<AppStartupStruct>> {
		let promises: AppStartupStruct[] = [];
		for (let index = 0; index < ids.length; index++) {
			const id = ids[index];
			let res = await processStartupDataSender(id, row);
			for (let i = 0; i < res.length; i++) {
				if (res[i].startName! < 6 && i < res.length - 1) {
					res[i].endItid = res[i + 1].itid;
				}
			}
			promises.push(...res);
		}
		return promises
	};
	funDataSenderCallback(
		rs: Array<unknown> | boolean,
		funcRow: TraceRow<FuncStruct>,
		thread: unknown
	): FuncStruct[] {
		if (rs === true) {
			funcRow.rowDiscard = true;
			return [];
		} else {
			let funs = rs as FuncStruct[];
			if (funs.length > 0) {
				funs.forEach((fun, index) => {
					//@ts-ignore
					funs[index].itid = thread.itid;
					//@ts-ignore
					funs[index].ipid = thread.ipid;
					//@ts-ignore
					funs[index].tid = thread.tid;
					//@ts-ignore
					funs[index].pid = thread.pid;
					funs[index].funName = Utils.getInstance().getCallStatckMap().get(funs[index].id!);
					if (Utils.isBinder(fun)) {
					} else {
						if (fun.nofinish) {
							fun.flag = 'Did not end';
						}
					}
					// if (fun.id && this.distributedDataMap.has(`${fun.id}_${this.traceId}`)) {
					//   let distributedData = this.distributedDataMap.get(`${fun.id}_${this.traceId}`);
					//   funs[index].chainId = distributedData!.chainId;
					//   funs[index].spanId = distributedData!.spanId;
					//   funs[index].parentSpanId = distributedData!.parentSpanId;
					//   funs[index].chainFlag = distributedData!.chainFlag;
					//   funs[index].traceId = this.traceId;
					// }
				});
			} else {
				this.trace.refreshCanvas(true);
			}
			return funs;
		}
	}
}

export class ListStruct {
	pid: number | undefined;
	tid: number | undefined;
	startTs: number | undefined;
	dur: number | undefined;
	startName: number | undefined;
}
