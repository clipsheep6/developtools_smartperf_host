//
// Created by x00880296 on 2024/11/7.
//

#ifndef TEST2_FFRTCONVERTER_H
#define TEST2_FFRTCONVERTER_H
#include <string>
#include <vector>
#include <regex>
#include <fstream>
#include <set>
using ConStr = const std::string;

struct tidInfo {
    std::vector<int> begin;
    int end;
    int gid;
    int qid;
};

using PidMap = std::unordered_map<int, std::set<int>>;
using FfrtTidMap = std::unordered_map<int, std::pair<std::string, std::vector<int>>>;
using FfrtPids = std::unordered_map<int, FfrtTidMap>;
using WakeLogs = std::unordered_map<int, std::vector<int>>;
using FfrtWakeLogs = std::unordered_map<int, WakeLogs>;
using QueueTaskInfo = std::unordered_map<int, std::unordered_map<int, tidInfo>>;
using FfrtQueueTasks = std::unordered_map<int, std::unordered_map<int, std::vector<tidInfo>>>;
using TaskLabels = std::unordered_map<int, std::unordered_map<int, std::string>>;

struct LogInfo {
    ConStr &log;
    int lineno;
    int pid;
    int tid;
    LogInfo(ConStr &log, int lineno, int pid, int tid) : log(log), lineno(lineno), pid(pid), tid(tid) {}
};

struct FakeLogArgs {
    int pid;
    int tid;
    int &taskRunning;
    int prio;
    int lineno;
    std::string &log;
    std::string &tname;
    std::string &taskLabel;
    std::string &cpuId;
    std::string &timestamp;
};

struct ContextUpdate {
    size_t position;
    std::vector<std::string> new_logs;
};

class FfrtConverter {
public:
    FfrtConverter() = default;
    ~FfrtConverter() = default;

    bool RecoverTraceAndGenerateNewFile(ConStr &ffrtFileName);

private:

    void SetOSPlatformKey(const std::unordered_map<int, std::pair<std::string, std::vector<int>>> &ffrt_tid_map);
    void FindFfrtProcClassifyLogs(LogInfo logInfo, WakeLogs &traceMap, PidMap &pidMap,
                                                  FfrtTidMap &ffrtTidMap, FfrtWakeLogs &ffrtWakeLogs);
    void ClassifyLogsForFfrtWorker(FfrtPids &ffrt_pids, FfrtWakeLogs &ffrt_wake_logs);

    void ConvertFrrtThreadToFfrtTaskOhos(FfrtPids &ffrtPids, FfrtWakeLogs& ffrtWakeLogs);
    void ConvertFrrtThreadToFfrtTaskNohos(FfrtPids &ffrtPids, FfrtWakeLogs &ffrtWakeLogs);

    // trace content
    std::vector<std::string> context_ = {};
    std::string tracingMarkerKey_;
    std::string osPlatformKet_ = "ohos";

    void FindQueueTaskInfo(FfrtPids &ffrtPids, QueueTaskInfo &queueTaskInfo);

    void HandleFfrtQueueTasks(FfrtQueueTasks &ffrtQueueTasks, FfrtWakeLogs& ffrtWakeLogs);

    void HandleMarks(ConStr &log, int lineno, int pid);

    bool HandleFfrtTaskCo(ConStr &log, int lineno, bool &switchInFakeLog, bool &switchOutFakeLog);

    bool HandleFfrtTaskExecute(FakeLogArgs &fakLogArg, WakeLogs &wakeLogs,
                               TaskLabels &taskLabels, std::string &label);

    void GenTaskLabelsOhos(FfrtPids &ffrtPids, FfrtWakeLogs& ffrtWakeLogs, TaskLabels &taskLabels);

    bool HandlePreLineno(FakeLogArgs &fakArg, WakeLogs &wakeLogs, TaskLabels &taskLabels);

    void SetTracingMarkerKey(LogInfo logInfo);

    void ExceQueTaskInfoPreLog(std::vector<int> &linenos, int pid, QueueTaskInfo &queueTaskInfo);

    void ExceTaskGroups(std::vector<tidInfo> &group, WakeLogs &wakeLogs, int firstGid);

    void HandleTaskGroups(std::vector<std::vector<tidInfo>> &taskGroups, WakeLogs &wakeLogs);

    void ExceTaskLabelOhos(TaskLabels &taskLabels, FfrtWakeLogs &ffrtWakeLogs, std::pair<int, FfrtTidMap> pidItem);

    bool HandleHFfrtTaskExecute(FakeLogArgs &fakeArgs, WakeLogs &wakeLogs, TaskLabels &taskLabels,
                                std::string label, std::unordered_map<int, int> &schedWakeFlag);

    bool HandlePreLinenoNohos(FakeLogArgs &fakArg, WakeLogs &wakeLogs,
                             TaskLabels &taskLabels, std::unordered_map<int, int> &schedWakeFlag);

    void ExceTaskLabelNohos(TaskLabels &taskLabels, FfrtWakeLogs &ffrtWakeLogs,
                           std::pair<int, FfrtTidMap> pidItem, std::unordered_map<int, int> &schedWakeFlag);
};
#endif // TEST2_FFRTCONVERTER_H