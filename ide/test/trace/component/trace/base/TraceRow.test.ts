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

// @ts-ignore
import {TraceRow} from "../../../../../dist/trace/component/trace/base/TraceRow.js";
describe("TraceRow Test", () => {
    
    beforeAll(() => {
    })
    it('TraceRow Test01', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow).not.toBeUndefined();
    });

    it('TraceRow Test02', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.sleeping).toBeFalsy();
    });

    it('TraceRow Test03', () => {
        let traceRow = new TraceRow<any>();
        traceRow.sleeping = true
        expect(traceRow.sleeping).toBeTruthy();
    });

    it('TraceRow Test04', () => {
        let traceRow = new TraceRow<any>();
        traceRow.sleeping = false
        expect(traceRow.sleeping).toBeFalsy();
    });

    it('TraceRow Test05', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.rangeSelect).toBeFalsy();
    });

    it('TraceRow Test06', () => {
        let traceRow = new TraceRow<any>();
        traceRow.rangeSelect = true
        expect(traceRow.rangeSelect).toBeTruthy();
    });
    it('TraceRow Test07', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        let traceRow = new TraceRow<any>();
        //transferControlToOffscreen()
        traceRow.canvas = jest.fn(()=>true)
        traceRow.args = jest.fn(()=>true)
        traceRow.args.isOffScreen = jest.fn(()=>true)
        // @ts-ignore
        traceRow.canvas.transferControlToOffscreen = jest.fn(()=>true)
        traceRow.dataList = {
            supplier:true,
            isLoading:false,
        }
        traceRow.args={
            isOffScreen:true,
        }
        traceRow.supplier = true;
        traceRow.isLoading = false;
        traceRow.name = "111"
        traceRow.height = 20
        traceRow.height = 30
        expect(traceRow.initCanvas()).toBeUndefined();
    });

    it('TraceRow Test08', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        let traceRow = new TraceRow<any>();
        traceRow.dataList = {
            supplier:true,
            isLoading:false,
        }
        traceRow.supplier = true;
        traceRow.isLoading = false;
        traceRow.name = "111"
        traceRow.height = 20
        traceRow.height = 30
        expect(traceRow.drawObject()).toBeUndefined();
    });

    it('TraceRow Test09', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        let traceRow = new TraceRow<any>();
        traceRow.dataList = {
            supplier:true,
            isLoading:false,
        }
        traceRow.supplier = true;
        traceRow.isLoading = false;
        traceRow.name = "111"
        traceRow.height = 20
        traceRow.height = 30
        expect(traceRow.drawObject()).toBeUndefined();
    });

    it('TraceRow Test10', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        let traceRow = new TraceRow<any>();
        traceRow.dataList = {
            supplier:true,
            isLoading:false,
        }
        traceRow.supplier = true;
        traceRow.isLoading = false;
        traceRow.name = "111"
        traceRow.height = 20
        traceRow.height = 30
        expect(traceRow.clearCanvas()).toBeUndefined();
    });

    it('TraceRow Test11', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        let traceRow = new TraceRow<any>();
        traceRow.dataList = {
            supplier:true,
            isLoading:false,
        }
        traceRow.supplier = true;
        traceRow.isLoading = false;
        traceRow.name = "111"
        traceRow.height = 20
        traceRow.height = 30
        expect(traceRow.drawLines()).toBeUndefined();
    });

    it('TraceRow Test12', () => {
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        const ctx = canvas.getContext('2d');
        let traceRow = new TraceRow<any>();
        traceRow.dataList = {
            supplier:true,
            isLoading:false,
        }
        traceRow.supplier = true;
        traceRow.isLoading = false;
        traceRow.name = "111"
        traceRow.height = 20
        traceRow.height = 30
        expect(traceRow.drawSelection()).toBeUndefined();
    });

    it('TraceRow Test13', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.collect).toBeFalsy();
    });

    it('TraceRow Test14', () => {
        let traceRow = new TraceRow<any>();
        traceRow.collect = true;
        expect(traceRow.collect).toBeTruthy();
    });

    it('TraceRow Test15', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.rowType).toBeFalsy();
    });

    it('TraceRow Test16', () => {
        let traceRow = new TraceRow<any>();
        traceRow.rowType = true;
        expect(traceRow.rowType).toBeTruthy();
    });

    it('TraceRow Test17', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.rowId).toBeFalsy();
    });

    it('TraceRow Test18', () => {
        let traceRow = new TraceRow<any>();
        traceRow.rowId = true;
        expect(traceRow.rowId).toBeTruthy();
    });

    it('TraceRow Test19', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.rowParentId).toBeFalsy();
    });

    it('TraceRow Test20', () => {
        let traceRow = new TraceRow<any>();
        traceRow.rowParentId = true;
        expect(traceRow.rowParentId).toBeTruthy();
    });

    it('TraceRow Test21', () => {
        let traceRow = new TraceRow<any>();
        traceRow.rowHidden = true;
        expect(traceRow.rowHidden).toBeUndefined();
    });

    it('TraceRow Test22', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.name).toBeFalsy();
    });

    it('TraceRow Test23', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.folder).toBeFalsy();
    });

    it('TraceRow Test24', () => {
        let traceRow = new TraceRow<any>();
        traceRow.folder = true;
        expect(traceRow.folder).toBeTruthy();
    });

    it('TraceRow Test25', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.expansion).toBeFalsy();
    });

    it('TraceRow Test26', () => {
        let traceRow = new TraceRow<any>();
        traceRow.expansion = true;
        expect(traceRow.expansion).toBeTruthy();
    });

    it('TraceRow Test27', () => {
        let traceRow = new TraceRow<any>();
        traceRow.tip = true;
        expect(traceRow.tip).toBeUndefined();
    });

    it('TraceRow Test28', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.frame).not.toBeUndefined();
    });

    it('TraceRow Test29', () => {
        let traceRow = new TraceRow<any>();
        traceRow.frame = [0,0,0];
        expect(traceRow.frame).toBeTruthy();
    });

    it('TraceRow Test30', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.checkType).not.toBeUndefined();
    });

    it('TraceRow Test31', () => {
        let traceRow = new TraceRow<any>();
        traceRow.checkType = true;
        expect(traceRow.checkType).toBeTruthy();
    });

    it('TraceRow Test32', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.drawType).toBeUndefined();
    });

    it('TraceRow Test33', () => {
        let traceRow = new TraceRow<any>();
        traceRow.drawType = true;
        expect(traceRow.drawType).toBeTruthy();
    });

    it('TraceRow Test34', () => {
        let traceRow = new TraceRow<any>();
        traceRow.args = jest.fn(()=>true)
        traceRow.args.isOffScreen = jest.fn(()=>null)
        expect(traceRow.updateWidth(1)).toBeUndefined();
    });

    it('TraceRow Test35', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.setCheckBox()).toBeUndefined();
    });

    it('TraceRow Test36', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.onMouseHover()).toBeFalsy();
    });

    it('TraceRow Test37', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.setTipLeft(1,null)).toBeFalsy();
    });

    it('TraceRow Test38', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.onMouseLeave(1,1)).toBeFalsy();
    });

    it('TraceRow Test39', () => {
        let traceRow = new TraceRow<any>();
        expect(traceRow.draw(false)).toBeFalsy();
    });


})