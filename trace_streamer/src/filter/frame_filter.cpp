/*
 * Copyright (c) 2021 Huawei Device Co., Ltd.
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
#include "frame_filter.h"
#include <memory>
#include "log.h"
namespace SysTuning {
namespace TraceStreamer {
FrameFilter::FrameFilter(TraceDataCache* dataCache, const TraceStreamerFilters* filter)
    : FilterBase(dataCache, filter)
{

}
FrameFilter::~FrameFilter() = default;

void FrameFilter::BeginVsyncEvent(uint64_t ts, uint64_t ipid, uint64_t itid, uint64_t expectStart, uint64_t expectEnd, uint32_t vsyncId, uint32_t callStackSliceRow)
{
    auto frame = std::make_shared<FrameSlice>();
    frame->startTs_ = ts;
    frame->callStackSliceRow_ = callStackSliceRow;
    frame->expectedStartTs_ = expectStart;
    frame->expectedEndTs_ = expectEnd;
    frame->vsyncId_ = vsyncId;
    frame->frameSliceRow_ =
        traceDataCache_->GetFrameSliceData()->AppendFrame(ts, ipid, itid, vsyncId, callStackSliceRow);
    frame->frameExpectedSliceRow_ = traceDataCache_->GetFrameSliceData()->AppendFrame(
        expectStart, ipid, itid, vsyncId, callStackSliceRow, expectEnd, (uint8_t)EXPECT_SLICE);
    vsyncRenderSlice_[itid].emplace(std::make_pair(vsyncId, frame));
}
bool FrameFilter::BeginOnvsyncEvent(uint64_t ts, uint64_t itid, uint64_t expectStart, uint64_t callStackSliceRow)
{
    auto frame = vsyncRenderSlice_.find(itid);
    if (frame == vsyncRenderSlice_.end()) {
        TS_LOGW("BeginOnvsyncEvent find for itid:%llu failed", itid);
        return false;
    }
    if (!frame->second.size()) {
        TS_LOGW("BeginOnvsyncEvent find for itid:%llu failed", itid);
        return false;
    }
    if (frame->second.begin()->second.get()->expectedStartTs_ != expectStart) {
        TS_LOGW("BeginOnvsyncEvent expect befor is:%llu, now is:%llu", frame->second.begin()->second.get()->expectedStartTs_, expectStart);
        return false;
    }
    frame->second.begin()->second.get()->vsyncEnd_ = false;
    frame->second.begin()->second.get()->callStackSliceRow_ = callStackSliceRow;
    traceDataCache_->GetFrameSliceData()->UpdateCallStackSliceRow(frame->second.begin()->second.get()->frameSliceRow_, callStackSliceRow);
    return true;
}
bool FrameFilter::EndOnVsyncEvent(uint64_t ts, uint64_t itid)
{
    auto frame = vsyncRenderSlice_.find(itid);
    if (frame == vsyncRenderSlice_.end()) {
        TS_LOGW("BeginOnvsyncEvent find for itid:%llu failed", itid);
        return false;
    }
    if (!frame->second.size()) {
        TS_LOGW("BeginOnvsyncEvent find for itid:%llu failed", itid);
        return false;
    }
    frame->second.begin()->second->endTs_ = ts;
    traceDataCache_->GetFrameSliceData()->SetEndTimeAndFlag(frame->second.begin()->second->frameSliceRow_, ts, frame->second.begin()->second->expectedDur_);
    frame->second.begin()->second->vsyncEnd_ = true;
    // from now on, maybe we do not known where renderSlice is
    if (frame->second.begin()->second->dstFrameSliceId_ == INVALID_UINT64) {
        TS_LOGI("render service not run yet");
        frame->second.erase(frame->second.begin());
    } else {
        if (frame->second.begin()->second->dstFrameSliceId_ != INVALID_UINT64) {
            // dstFrameSliceId has been set
            frame->second.erase(frame->second.begin());
        }
    }
    return true;
}
bool FrameFilter::BeginRSTransactionData(uint64_t ts, uint64_t itid, uint32_t franeNum)
{
    auto frame = vsyncRenderSlice_.find(itid);
    if (frame == vsyncRenderSlice_.end()) {
        TS_LOGW("BeginRSTransactionData find for itid:%llu failed", itid);
        return false;
    }
    if (!frame->second.size()) {
        TS_LOGW("BeginRSTransactionData find for itid:%llu failed", itid);
        return false;
    }
    frame->second.begin()->second.get()->frameNum_ = franeNum;
    if (!dstRenderSlice_.count(itid)) {
        std::map<uint32_t/* vsyncId */, std::shared_ptr<FrameSlice>> frameMap;
        dstRenderSlice_.insert(std::make_pair(itid, std::move(frameMap)));
    }
    dstRenderSlice_.at(itid).emplace(std::make_pair(franeNum, frame->second.begin()->second));
    return true;
}
bool FrameFilter::BeginProcessCommandUni(uint64_t ts, uint64_t itid, std::vector<FrameMap>& frames, uint32_t sliceIndex)
{
    auto frame = vsyncRenderSlice_.find(itid);
    if (frame == vsyncRenderSlice_.end()) {
        TS_LOGW("BeginProcessCommandUni find for itid:%;llu failed", itid);
        return false;
    }
    if (!frame->second.size()) {
        TS_LOGW("BeginProcessCommandUni find for itid:%llu failed", itid);
        return false;
    }
    std::vector<uint64_t> fromSlices = {};
    std::vector<uint64_t> fromExpectedSlices = {};
    for (auto &&it : frames) {
        auto sourceFrameMap = dstRenderSlice_.find(it.sourceItid);
        if (sourceFrameMap == dstRenderSlice_.end()) {
            //error
            TS_LOGE("BeginProcessCommandUni find for itid:%llu framenum:%u failed", it.sourceItid, it.frameNum);
            continue;
        }
        auto srcFrame = sourceFrameMap->second.find(it.frameNum);
        if (srcFrame == sourceFrameMap->second.end()) {
            //error
            TS_LOGE("BeginProcessCommandUni find for itid:%llu framenum:%u failed", it.sourceItid, it.frameNum);
            continue;
        }
        fromSlices.push_back(srcFrame->second.get()->frameSliceRow_);
        fromExpectedSlices.push_back(srcFrame->second.get()->frameExpectedSliceRow_);
        srcFrame->second.get()->dstFrameSliceId_ = frame->second.begin()->second->frameSliceRow_; // 这里需要观察一下framequeue是否已经结束
        srcFrame->second.get()->dstExpectedFrameSliceId_ = frame->second.begin()->second->frameExpectedSliceRow_; // 这里需要观察一下framequeue是否已经结束
        traceDataCache_->GetFrameMapsData()->AppendNew(srcFrame->second.get()->frameSliceRow_, srcFrame->second.get()->dstFrameSliceId_);
        traceDataCache_->GetFrameMapsData()->AppendNew(srcFrame->second.get()->frameExpectedSliceRow_, srcFrame->second.get()->dstExpectedFrameSliceId_);
        traceDataCache_->GetFrameSliceData()->SetDst(srcFrame->second.get()->frameSliceRow_, srcFrame->second.get()->dstFrameSliceId_);
        traceDataCache_->GetFrameSliceData()->SetDst(srcFrame->second.get()->frameExpectedSliceRow_, srcFrame->second.get()->dstExpectedFrameSliceId_);
        if (srcFrame->second.get()->endTs_ != INVALID_UINT64) {
            // erase Source
            sourceFrameMap->second.erase(it.frameNum);
        }
    }
    if (!fromSlices.size()) {
        return false;
    }
    frame->second.begin()->second->sourceSlice_ = fromSlices;
    frame->second.begin()->second->sourceExpectedSlice_ = fromExpectedSlices;
    traceDataCache_->GetFrameSliceData()->SetSrcs(frame->second.begin()->second->frameSliceRow_, fromSlices);
    traceDataCache_->GetFrameSliceData()->SetSrcs(frame->second.begin()->second->frameExpectedSliceRow_, fromExpectedSlices);
    return true;
}
bool FrameFilter::EndVsyncEvent(uint64_t ts, uint64_t itid)
{
    auto frame = vsyncRenderSlice_.find(itid);
    if (frame == vsyncRenderSlice_.end()) {
        TS_LOGW("EndVsyncEvent find for itid:%llu ts:%llu failed", itid, ts);
        return false;
    }
    if (!frame->second.size()) {
        TS_LOGW("EndVsyncEvent find for itid:%llu ts:%llu failed", itid, ts);
        return false;
    }
    if (frame->second.begin()->second->hasFrameQueue_) {
        // if recv frameQueue
        // check if frmeQueue ended
        if (frame->second.begin()->second->endTs_ != INVALID_UINT64) {
            // if frame already ended
            TS_LOGE("Frame Queue Ended Before Vsync End");
            // update dur
            traceDataCache_->GetFrameSliceData()->SetEndTimeAndFlag(frame->second.begin()->second->frameSliceRow_, ts, frame->second.begin()->second->expectedDur_);
            frame->second.begin()->second->endTs_ = ts;
            // for Render serivce
            frame->second.erase(frame->second.begin());
        }
    } else {
        // nothing to do, it is a app, or invalid RenderService
    }
    return true;
}
// only for renderservice
bool FrameFilter::StartFrameQueue(uint64_t ts, uint64_t itid)
{
    auto frame = vsyncRenderSlice_.find(itid);
    if (frame == vsyncRenderSlice_.end()) {
        TS_LOGW("StartFrameQueue find for itid:%llu failed", itid);
        return false;
    }
    if (!frame->second.size()) {
        TS_LOGW("StartFrameQueue find for itid:%llu failed", itid);
        return false;
    }
    frame->second.begin()->second->hasFrameQueue_ = true;
    return true;
}
bool FrameFilter::EndFrameQueue(uint64_t ts, uint64_t itid)
{
    auto frame = vsyncRenderSlice_.find(itid);
    if (frame == vsyncRenderSlice_.end()) {
        TS_LOGW("EndFrameQueue find for itid:%llu failed", itid);
        return false;
    }
    if (!frame->second.size()) {
        TS_LOGW("EndFrameQueue find for itid:%llu failed", itid);
        return false;
    }
    if (frame->second.begin()->second.get()->endTs_ == INVALID_UINT64) {
        traceDataCache_->GetFrameSliceData()->SetEndTimeAndFlag(frame->second.begin()->second.get()->frameSliceRow_, ts, frame->second.begin()->second.get()->expectedDur_);
        frame->second.begin()->second.get()->endTs_ = ts;
        if (frame->second.begin()->second.get()->vsyncEnd_) {
            // if vsync ended
            frame->second.erase(frame->second.begin());
        }
    } else {
        TS_LOGW("something error");
    }
    return true;
}
void FrameFilter::Finish()
{
    vsyncRenderSlice_.clear();
    dstRenderSlice_.clear();
}
} // namespace TraceStreamer
} // namespace SysTuning
