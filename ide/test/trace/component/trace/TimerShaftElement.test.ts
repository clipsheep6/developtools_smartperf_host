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
import {TimerShaftElement} from "../../../../dist/trace/component/trace/TimerShaftElement.js"


describe('TimerShaftElement Test', () => {
    let timerShaftElement = new TimerShaftElement();

    timerShaftElement.cpuUsage = 'cpuUsage'

    it('TimerShaftElementTest01', function () {
        timerShaftElement.rangeRuler = jest.fn(() => true)
        timerShaftElement.rangeRuler.cpuUsage  = jest.fn(() => true)
        expect(timerShaftElement.cpuUsage).toBeUndefined();
    });

    it('TimerShaftElementTest02', function () {
        timerShaftElement.rangeRuler = jest.fn(() => false)
        timerShaftElement.loadComplete = jest.fn(() => false)
        timerShaftElement.rangeRuler.markA = jest.fn(() => true)
        timerShaftElement.rangeRuler.markB = jest.fn(() => true)
        timerShaftElement.rangeRuler.markA.frame = jest.fn(() => true)
        timerShaftElement.rangeRuler.markB.frame = jest.fn(() => true)
        timerShaftElement.rangeRuler.markA.frame.x = jest.fn(() => 0)
        timerShaftElement.rangeRuler.markB.frame.x = jest.fn(() => true)
        timerShaftElement.rangeRuler.frame = jest.fn(() => true)
        timerShaftElement.rangeRuler.frame.width = jest.fn(() => 8)
        timerShaftElement.rangeRuler.cpuUsage = jest.fn(() => [])
        timerShaftElement.sportRuler = jest.fn(() => true)
        timerShaftElement.sportRuler.flagList = jest.fn(() => false)
        timerShaftElement.sportRuler.flagList.length = jest.fn(() =>0)
        timerShaftElement.totalNS =jest.fn(()=>false);
        timerShaftElement.sportRuler.isRangeSelect = jest.fn(() => false)
        expect(timerShaftElement.reset()).toBeUndefined();
    });

    it('spApplicationTest10',function (){
        expect(timerShaftElement.reset()).not.toBeUndefined()
    });


    it('TimerShaftElementTest03', function () {
        timerShaftElement.timeRuler = jest.fn(() => false)
        timerShaftElement.sportRuler = jest.fn(() => false)
        timerShaftElement.rangeRuler = jest.fn(() => false)
        timerShaftElement.timeRuler.frame = jest.fn(() => {
            return document.createElement('canvas') as HTMLCanvasElement
        })

        timerShaftElement.sportRuler.frame = jest.fn(() => {
            return document.createElement('canvas') as HTMLCanvasElement
        })

        timerShaftElement.rangeRuler.frame = jest.fn(() => {
            return document.createElement('canvas') as HTMLCanvasElement
        })
        expect(timerShaftElement.connectedCallback()).toBeUndefined();
    });

    it('TimerShaftElementTest04', function () {
        timerShaftElement.canvas = jest.fn(()=> {
            return {
                width: 20,
                height: 20,
                style: {
                    width: 30,
                    height: 30,
                }
            }
        })
        timerShaftElement.canvas.style = jest.fn(() => true)
        timerShaftElement.rangeRuler.fillX = jest.fn(() => true)
        timerShaftElement.timeRuler.draw = jest.fn(() => true)
        timerShaftElement.rangeRuler.draw = jest.fn(() => true)
        timerShaftElement.sportRuler.draw = jest.fn(() => true)
        expect(timerShaftElement.updateWidth(2)).toBeUndefined();
    });

    it('TimerShaftElementTest05', function () {
        expect(timerShaftElement.disconnectedCallback()).toBeUndefined();
    });

    it('TimerShaftElementTest06', function () {
        expect(timerShaftElement.totalNS).toBe(10000000000);
    });
    it('TimerShaftElementTest10', function () {
        timerShaftElement.totalNS = 10000000000;
        expect(timerShaftElement.totalNS).toBe(10000000000);
    });

    it('TimerShaftElementTest07', function () {
        // timerShaftElement._sportRuler.modifyFlagList = jest.fn(() => true)
        expect(timerShaftElement.modifyFlagList()).toBeUndefined();
    });

    it('TimerShaftElementTest08', function () {
        timerShaftElement.startNS = 'startNS'
        expect(timerShaftElement.startNS).toBe('startNS');
    });

    it('TimerShaftElementTest09', function () {
        timerShaftElement.endNS = 'endNS'
        expect(timerShaftElement.endNS).toBe('endNS');
    });

    it('TimerShaftElementTest11', function () {
        expect(timerShaftElement.render()).toBe(undefined);
    });

    it('TimerShaftElementTest12', function () {
        timerShaftElement.ctx = jest.fn(()=>true)
        timerShaftElement.ctx.fillStyle = jest.fn(()=>'transparent')
        timerShaftElement.ctx.fillRect = jest.fn(()=>true)
        expect(timerShaftElement.render()).toBe(undefined);
    });
})
