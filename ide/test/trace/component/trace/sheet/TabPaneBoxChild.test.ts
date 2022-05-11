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
// import { it } from "mocha"
import {TabPaneBoxChild} from "../../../../../dist/trace/component/trace/sheet/TabPaneBoxChild.js"
window.ResizeObserver = window.ResizeObserver ||
    jest.fn().mockImplementation(() => ({
        disconnect: jest.fn(),
        observe: jest.fn(),
        unobserve: jest.fn(),

    }));
describe('TabPaneBoxChild Test', () => {
    let tabPaneBoxChild = new TabPaneBoxChild();
    tabPaneBoxChild.parentElement= jest.fn(()=> {
                return {clientHeight:56}
            })
    tabPaneBoxChild.parentElement.clientHeight= jest.fn(()=>100)
    tabPaneBoxChild.data = {
        cpus: [],
        threadIds: [],
        trackIds: [],
        funTids: [],
        heapIds:[],
        leftNs: 0,
        rightNs: 0,
        hasFps: false,
        // parentElement:{
        //     clientHeight:0,
        // }
    }
    // tabPaneBoxChild.parentElement = {
    //     clientHeight:0,
    // }

    it('TabPaneBoxChildTest01', function () {

        expect(tabPaneBoxChild.sortByColumn({
            key: 'name',
            sort: () => {
            }
        })).toBeUndefined();
    });
    // it('TabPaneBoxChildTest02',function(){
    //     TabPaneBoxChild.parentElement= jest.fn(()=> {
    //         return {clientHeight:56}
    //     })
    //     // TabPaneBoxChild.parentElement.clientHeight= jest.fn(()=>100)
    //     expect(tabPaneBoxChild.data).toBeUndefined();
    // })
  
})
