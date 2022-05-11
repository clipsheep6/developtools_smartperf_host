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

import {BaseElement, element} from "../../base-ui/BaseElement.js";

@element('sp-metrics')
export class SpMetrics extends BaseElement {
    initElements(): void {
    }

    initHtml(): string {
        return `
<style>
:host{
    width: 100%;
    height: 100%;
    background-color: aqua;
}
xmp{
    color: #121212;
    background-color: #eeeeee;
    padding: 30px;
    margin: 30px;
    overflow: auto;
    border-radius: 20px;
}
</style>
<div>
<xmp>
    trace_metadata: {
  trace_duration_ns: 14726175738
  trace_uuid: "00000000-0000-0000-c0bd-eb5c5728bf40"
  statsd_triggering_subscription_id: 0
  unique_session_name: ""
  trace_size_bytes: 57202082
  trace_config_pbtxt: "buffers: {  size_kb: 63488\\n  fill_policy: DISCARD\\n}\\nbuffers: {\\n  size_kb: 2048\\n  fill_policy: DISCARD\\n}\\ndata_sources: {\\n  config: {\\n    name: \\"linux.process_stats\\"\\n    target_buffer: 1\\n    trace_duration_ms: 0\\n    tracing_session_id: 0\\n    enable_extra_guardrails: false\\n    ftrace_config: {\\n      buffer_size_kb: 0\\n      drain_period_ms: 0\\n    }\\n    chrome_config: {\\n      trace_config: \\"\\"\\n      privacy_filtering_enabled: false\\n    }\\n    inode_file_config: {\\n      scan_interval_ms: 0\\n      scan_delay_ms: 0\\n      scan_batch_size: 0\\n      do_not_scan: false\\n    }\\n    process_stats_config: {\\n      scan_all_processes_on_start: true\\n      record_thread_names: false\\n      proc_stats_poll_ms: 1000\\n      proc_stats_cache_ttl_ms: 0\\n    }\\n    sys_stats_config: {\\n      meminfo_period_ms: 0\\n      vmstat_period_ms: 0\\n      stat_period_ms: 0\\n    }\\n    heapprofd_config: {\\n      sampling_interval_bytes: 0\\n      all: false\\n      continuous_dump_config: {\\n        dump_phase_ms: 0\\n        dump_interval_ms: 0\\n      }\\n      shmem_size_bytes: 0\\n      block_client: false\\n    }\\n    android_power_config: {\\n      battery_poll_ms: 0\\n      collect_power_rails: false\\n    }\\n    android_log_config: {\\n      min_prio: PRIO_UNSPECIFIED\\n    }\\n    packages_list_config: {\\n    }\\n    legacy_config: \\"\\"\\n  }\\n}\\ndata_sources: {\\n  config: {\\n    name: \\"linux.ftrace\\"\\n    target_buffer: 0\\n    trace_duration_ms: 0\\n    tracing_session_id: 0\\n    enable_extra_guardrails: false\\n    ftrace_config: {\\n      ftrace_events: \\"sched/sched_switch\\"\\n      ftrace_events: \\"power/suspend_resume\\"\\n      ftrace_events: \\"sched/sched_wakeup\\"\\n      ftrace_events: \\"sched/sched_wakeup_new\\"\\n      ftrace_events: \\"sched/sched_waking\\"\\n      ftrace_events: \\"power/cpu_frequency\\"\\n      ftrace_events: \\"power/cpu_idle\\"\\n      ftrace_events: \\"sched/sched_process_exit\\"\\n      ftrace_events: \\"sched/sched_process_free\\"\\n      ftrace_events: \\"task/task_newtask\\"\\n      ftrace_events: \\"task/task_rename\\"\\n      ftrace_events: \\"lowmemorykiller/lowmemory_kill\\"\\n      ftrace_events: \\"oom/oom_score_adj_update\\"\\n      ftrace_events: \\"ftrace/print\\"\\n      atrace_categories: \\"gfx\\"\\n      atrace_apps: \\"lmkd\\"\\n      buffer_size_kb: 0\\n      drain_period_ms: 0\\n    }\\n    chrome_config: {\\n      trace_config: \\"\\"\\n      privacy_filtering_enabled: false\\n    }\\n    inode_file_config: {\\n      scan_interval_ms: 0\\n      scan_delay_ms: 0\\n      scan_batch_size: 0\\n      do_not_scan: false\\n    }\\n    process_stats_config: {\\n      scan_all_processes_on_start: false\\n      record_thread_names: false\\n      proc_stats_poll_ms: 0\\n      proc_stats_cache_ttl_ms: 0\\n    }\\n    sys_stats_config: {\\n      meminfo_period_ms: 0\\n      vmstat_period_ms: 0\\n      stat_period_ms: 0\\n    }\\n    heapprofd_config: {\\n      sampling_interval_bytes: 0\\n      all: false\\n      continuous_dump_config: {\\n        dump_phase_ms: 0\\n        dump_interval_ms: 0\\n      }\\n      shmem_size_bytes: 0\\n      block_client: false\\n    }\\n    android_power_config: {\\n      battery_poll_ms: 0\\n      collect_power_rails: false\\n    }\\n    android_log_config: {\\n      min_prio: PRIO_UNSPECIFIED\\n    }\\n    packages_list_config: {\\n    }\\n    legacy_config: \\"\\"\\n  }\\n}\\nduration_ms: 15000\\nenable_extra_guardrails: false\\nlockdown_mode: LOCKDOWN_UNCHANGED\\nstatsd_metadata: {\\n  triggering_alert_id: 0\\n  triggering_config_uid: 0\\n  triggering_config_id: 0\\n  triggering_subscription_id: 0\\n}\\nwrite_into_file: false\\nfile_write_period_ms: 0\\nmax_file_size_bytes: 0\\nguardrail_overrides: {\\n  max_upload_per_day_bytes: 0\\n}\\ndeferred_start: false\\nflush_period_ms: 0\\nflush_timeout_ms: 0\\nnotify_traceur: false\\ntrigger_config: {\\n  trigger_mode: UNSPECIFIED\\n  trigger_timeout_ms: 0\\n}\\nallow_user_build_tracing: false\\nbuiltin_data_sources: {\\n  disable_clock_snapshotting: false\\n  disable_trace_config: false\\n  disable_system_info: false\\n}\\nincremental_state_config: {\\n  clear_period_ms: 0\\n}\\nunique_session_name: \\"\\"\\ncompression_type: COMPRESSION_TYPE_UNSPECIFIED\\nincident_report_config: {\\n  destination_package: \\"\\"\\n  destination_class: \\"\\"\\n  privacy_level: 0\\n  skip_dropbox: false\\n}"
  sched_duration_ns: 14726119124
}
</xmp>       
</div>
        `;
    }
}