bytrace离线解析工具

此工具用来将一个bytrace文本文件转化为sqlite的数据库文件。

>> 使用方式
trace_streamer.exe [bytrace文件路径] -e 输出文件路径.db

查看版本号
trace_streamer.exe -v

>> 注意事项：
在转数据库之后，会在trace_streamer.exe文件所在的目录下创建trace_streamer.log文件，此文件由时间戳:结果值（比如 1619438955744:0）组成。
对于结果值（只针对db解析）
0 正常结束
1 文件类型错误
2 文件解析失败
3 其他




------------changelog--------------

date:2021/4/25 22:00 version 0.1.100
first commit

date:2021/4/26 16:46 version 0.1.101
fix bytrace sched waking event

date:2021/4/26 22:15 version 0.1.102
fix call stack function name

date:2021/4/26 22:15 version 0.1.103
fix call stack function name

date:2021/4/27 13:59 version 0.1.104
write status into file only when parse finished

date:2021/5/17 16:59 version 0.1.107
optimize the code, normalize the code

date:2021/5/19 17:21 version 0.1.108
no feature changed, just fix coding style

date:2021/5/24 16:21 version 0.1.109
no feature changed, just fix coding style

date:2021/5/27 14:40 version 0.1.110
no feature changed, just fix coding style

date:2021/6/18 9:49 version 0.1.111
no feature changed, just fix bug 1241

date:2021/7/8 9:49 version 1.0.101
remove extra runnable status

date:2021/7/14 16:10 version 1.0.102
no feature changed, just fix bug 1511

date:2021/7/14 16:10 version 1.0.103
add htrace parser

date:2021/7/29 11:32 version 1.0.104
parse faster

date:2021/8/19 10:19 version 1.0.105
mem parser

date:2021/8/25 16:04 version 1.1.100
support clock event and mem parser


date:2021/8/25 16:04 version 1.1.101
change table name of clock_filter to clock_event_filter


date:2021/8/30 17:04 version 1.1.102
compatitable with state 4096, treat it as Sleep


date:2021/9/7 20:20 version 1.1.103
parser faster

date:2021/9/8 11:10 version 1.1.104
fix bug

date:2021/9/9 17:10 version 1.1.110
add depth info as layer to async events

date:2021/9/18 14:10 version 1.1.201
support irq event and binder event


date:2021/9/18 14:10 version 1.1.210
support log parse and sys mem parse

date:2021/10/15 14:10 version 1.2.0
support log parse and sys mem parse, fix thread state on multi cpu device

date:2021/10/21 14:20 version 2.0.100
support process_free event, no businiess to IDE.

date:2021/10/22 17:10 version 2.0.101
fix bug of parse binder event

date:2021/11/12 14:00 version 2.0.110
fix trace range

date:2021/11/18 16:00 version 2.0.112
just new version, fix some code-check problems

date:2021/11/24 14:00 version 2.0.114
support threaed state "t|K"

date:2021/12/3 10:00 version 2.0.115
update the dur of appending callstack

date:2021/12/7 20:00 version 2.0.117
fix trace range

date:2022/21 12:00 version 2.2.100
support not head bytrace

date:2022/21 15:00 version 2.2.101
support not head bytrace

date:2022/21 15:00 version 2.2.102
support fps, native hook for all version, support wasm and httpd for linux and mac

date:2022/24 22:00 version 2.2.103
time format of fps changed
date:2022/24 22:00 version 2.2.104
fix process name
date:2022/4/12 19:00 version 2.4.103
update parse bytrace format
date:2022/4/14 19:50 version 2.4.104
support parse Allocation Data

date:2022/4/21 17:15 version 2.4.105
change _heap to _native_hook table
change _heap_frame to _native_hook_frame table
change trace_range rule
use a bigger sort-cache for sched-switch event.

date:2022/4/25 14:30 version 2.4.106
use column-based database,compatible with doc format trace

date:2022/4/25 20:00 version 2.4.108
do not use column-based db temporarily

date:2022/4/26 20:00 version 2.4.109
fix wakeing event

date:2022/4/28 21:00 version 2.4.110
sort print event by time 
date:2022/4/29 11:40 version 2.4.111
fix print event of htrace
date:2022/5/9 18:20 version 2.4.112
fix wakeup event, and trace_range

date:2022/5/11 18:20 version 2.4.113
sort all data according ts, recover meta table

date:2022/5/12 16:00 version 2.4.114
fix meta table, fix thread_state

date:2022/5/16 16:00 version 2.4.116
fix htrace parser

date:2022/5/18 16:00 version 2.4.118
add diskio, network parser

date:2022/5/20 16:00 version 2.4.119
Activity monitor data ok

date:2022/5/23 14:00 version 2.5.100
fix pss, disk-write, disk-read of liveprocess

date:2022/5/23 14:00 version 2.5.101
support system network 

date:2022/5/23 16:30 version 2.5.103
compile with rotos of 5.10.79_aarch64 to support rk

date:2022/5/24 21:00 version 2.5.104
add total_load

date:2022/5/24 21:00 version 2.5.106
fix network ts

date:2022/5/27 9:00 version 2.5.109
support perf, support PMEM_KERNEL_RECLAIMABLE


date:2022/6/2 16:00 version 2.5.111
columne-based database, need test

date:2022/6/2 17:00 version 2.5.112
do not use column-based database temparily

date:2022/6/7 17:00 version 2.5.113
Resolving possible segment errors in multithreading

date:2022/6/13 20:00 version 2.5.114
add wakeup from

date:2022/6/14 20:00 version 2.5.115
add identity to callstack name

date:2022/6/14 20:00 version 2.5.116
no change

date:2022/6/16 19:00 version 2.5.117
fix coding style

date:2022/6/23 20:00 version 2.5.120
fix binder


date:2022/6/29 18:00 version 2.5.123
fix endtime of unended slice.

date:2022/7/1 18:00 version 2.5.124
native_hook optimizes string storage

date:2022/7/5 10:00 version 2.5.125
fix parse async callstack bug

date:2022/7/8 11:30 version 2.5.127
add thread name to callstack event, fix wakeup event of htrace, fix async event

date:2022/7/8 11:30 version 2.5.128
control the max-limit of memory, can parse bigger htrace(311MB) on 16Gb-PC

date:2022/7/14 16:30 version 2.6.100
compatitable with thread-rename event is antive-hook.

date:2022/7/20 16:00 version 2.6.102
no change

date:2022/7/28 16:00 version 2.6.103
fix parse htrace with out thread name && pase trace with Special symbols

date:2022/8/1 17:00 version 2.6.104
no change

date:2022/8/4 16:00 version 2.6.105
compress native_hook and perf Callstack && return result with multi segment

date:2022/8/11 16:00 version 2.6.106
column based db, binder not ok yet

date:2022/8/17 17:00 version 2.6.108
column based db, binder not ok yet,fix process_measure_filter id filter bug.

date:2022/8/29 16:00 version 2.6.109
support parse ebpf file system event.

date:2022/8/30 20:30 version 2.6.110
support parse ebpf file system event with new type.

date:2022/8/31 16:30 version 2.6.111
support parse htrace  workque_execut_start event with no symbol table. 

date:2022/9/2 18:30 version 2.6.112
The process table adds whether there are threads, call stacks, and process memory identifiers. 

date:2022/9/7 17:00 version 2.6.114
add last_lib_id to native_hook table 

date:2022/9/7 17:00 version 2.6.115
fix flags for thread sched event && fix parser last_lib_id error

date:2022/9/15 16:00 version 2.6.116
add virtual memory by EBPF

date:2022/9/16 16:00 version 2.6.117
fix virtual memory has no callback error

date:2022/9/16 16:00 version 2.6.118
fix SDK error && support cpu_frequency_limit && parser ebpf faster

date:2022/9/22 15:30 version 2.6.119
Check symbolic results

date:2022/9/23 17:30 version 2.6.120
Hisysevent enhanced compatibility && Increase the cpu of htrace_ freq_ evenry_ Analysis of limits && support parse sdk in one file

date:2022/9/23 17:30 version 2.6.124
fix cpu_idle state && fix htrace cpu frequency limits

date:2022/9/27 14:00 version 2.6.125
fix sysevent parser

date:2022/9/27 17:30 version 2.6.126
filter illegal ip when parse pageed mem

date:2022/9/29 19:30 version 2.6.127
fixed some error for fs, pagemem, bio

date:2022/10/12 14:30 version 2.6.128
add clock_snapshot and datasource_clockid table.
change biotable's column path to path_id

date:2022/10/14 10:00 version 2.6.129
update trace range 

date:2022/10/19 10:40 version 2.6.130
hisysevent adds device status，add pluginname for sdk tablename

date:2022/10/27 19:10 version 2.6.131
support parse kernel symbols.

date:2022/11/4 17:00 version 2.6.132
fix hisysevent error && fix cpu thread error && fix mem dur error

date:2022/11/9 10:51 version 2.6.133
Add hisysevent configuration information

date:2022/11/25 14:05 version 2.6.134
Fix timing bugs

date:2022/11/28 17:30 version 2.6.135
Fix perf and ebpf callstack bug

date:2022/11/29 10:30 version 2.6.136
 support boot and mono clock-source ftrace, some source data's clock_id may change.

date:2022/11/29 17:30 version 2.6.137
修复了：时钟号变化后，数据队列中的数据时钟号没有及时跟新，导致最终时钟同步出问题，界面timerange出错。

date:2022/12/21 11:30 version 2.6.138
针对EBPF数据文件系统数据中的读写操作，数据库中增加执行读写操作的文件路径。 

date:2022/12/27 17:00 version 2.6.139
native_hook表的last_lib_id字段增加过滤libc++_shared.so。当nativ_hook调用栈函数所属库文件路径全部为要过滤的库时，使用调用栈第一层函数所属的库文件路径作为最后一个调用库。 

date:2023/1/11 17:30 version 2.6.140
native_hook_frame表增加vaddr字段。 

date:2023/2/1 17:30 version 2.6.141
修复windows解析nativehook数据崩溃的问题，原因是sqlite在不同操作系统上的运行规则有不同，现做了兼容。

date:2023/2/16 11:30 version 2.6.142
修复smaps数据解析的bug（自查发现），支持sched_blocked_reason的解析。

date:2023/2/17 9:50 version 2.6.143
修复data_dict字符串中出现乱码的问题。

date:2023/3/1 13:50 version 2.6.144
给irq添加ipi时长，修复waking事件和最新版本的perfetto不一致的问题。

date:2023/3/3 14:50 version 2.6.145
解决ebpf内核符号表解析乱码的问题

date:2023/3/8 14:00 version 2.6.146
支持解析frame数据，针对帧对齐需求

date:2023/3/9 15:30 version 2.6.148
修复frame数据的RenderService的实际渲染时长、

date:2023/3/9 20:30 version 3.0.0
增加是否卡顿的标识

date:2023/3/20 11:30 version 3.0.4
支持更多的RS数据解析，从waking事件改为支持解析wakeup事件，cpu区重叠问题

date:2023/4/25 17:30 version 3.1.8
支持js-memory解析，maps更新场景下的离线符号化

date:2023/4/28 15:30 version 3.1.9
线程名称总是使用trace中最新的。

date:2023/5/6 17:00 version 3.2.1
修改sdk标杆文件不能导入的问题 && 修改js内存解析to_node_id问题

date:2023/6/1 20:02 version 3.2.6
1.  修改trace_range解析规则，适配两个数据源时间没有交集的情况。
2.  task_rename事件解析时关联进程号
3.  native_hook 在线符号化模式支持导入so重新符号化。
4.  修改WASM导入so接口， 删除多余参数。（IDE需要同步修改）
5.  下载gn, ninja依赖华为开源软件库 ,emsdk依赖github仓库
6.  告警清理，冗余代码清理


date:2023/6/2 19:00 version 3.2.7
修改task rename的问题，支持build.sh在任意路径下执行。

date：2023/6/9 17:30 version 3.2.8
修复sdk加载失败， 清理无用的patch, 删除htrace_parser, 修复Mmap Mumap subTpye匹配问题, UT整改， 简化编译文档。

date：2023/6/9 17:30 version 3.2.9
修复客户编译linux debug版本失败问题， 适配端侧修改js-memory插件名称， 支持在内存为16G的设备上1G大小so文件重复导入。

date：2023/6/28 15:00 version 3.3.0
1. 卡顿丢帧业务新增卡顿状态  |rs start - ui end| < 1ms 正常，否则异常
2. ftrace调用栈问题修复
3. 解决emsdk的node.js版本更新导致的编译问题。

date：2023/6/30 11:30 version 3.3.1
修复卡顿丢帧12769相关连线错误的问题

date：2023/7/10 20:30 version 3.4.1
新增应用启动功能，目前支持单应用解析，多应用启动客户数据待确认。

date：2023/7/13 15:30 version 3.4.2
新增taskpool功能，修复应用启动so初始化泳道图重叠的问题，整改gn文件，添加subsystem_name && part_name

date：2023/7/13 15:30 version 3.4.3
新增动效场景快速分析，响应时延客户数据待确认，完成时延采用临时方案。修复应用启动重复包名不展示的问题

date：2023/7/19 14:30 version 3.4.4
新增arkTs数据解析，native_hook统计模式增加sub_type字段。修复windows下导出无法正常导出数据库的问题，修复应用启动阶段parentId未判断非法值的问题。

date：2023/7/21 15:00 version 3.4.5
修改arkTs数据时间有偏差的问题,taskpool支持了多进程调用同任务

date：2023/7/26 16:00 version 3.4.6
支持系统内存解析， 修复了arkTs数据时钟源同步的问题, 支持动效使用leashWindow名称
支持事件开关功能，支持taskpool超时事件，修改去重方案，修复源数据不存在的字段解析出的db仍然有值的问题。

date：2023/8/3 17:30 version 3.4.7
修改protoreader在一些情况下解析死循环的问题，修改客户验收的代码整改问题，修复windows下1.5G大文件解析会失败的问题。

date：2023/8/10 17:00 version 3.4.8
重复代码整改。

date：2023/8/23 16:00 version 3.4.10
nativehook增加last_symbol_id列，perf_callchain表优化调用栈压缩算法，对于符号化失败的调用栈进行记录，并且更新了name字段的显示规则。修改文本格式的hilog解析问题。缩短编译生成二进制的路径。metrics功能支持多标签查询，修复windows版本会因路径问题查不出metrics结果的问题，修复命令行下执行metrics与IDE显示不一致的问题。
修复两个线程互换cpu运行场景。 wake kill状态显示runable

date：2023/8/30 16:00 version 3.4.11
渲染帧改为通过DoComposition函数识别，修复线程状态DK解析问题。 

date：2023/9/14 18:00 version 3.4.13
修复文件分割相关问题。

date：2023/9/21 18:00 version 3.4.14
新增大文件切割功能，新增raw trace功能，代码整改问题修改，支持perf调用栈压缩解析和切割，修复thread_state表结果查询错误的问题。

date：2023/9/27 17:00 version 3.4.15
修复以下问题：
1. 动效帧率算法更新                                      
2. wasm下解析raw trace 比 linux下解析结果少了70%         
3. raw trace解析结果与转换后的文本解析结果不一致。         
4. mem新增数据解析。                                                             
5. 大文件一起切                                          
6. 线程状态解析htrace和txt对齐。                         
7. perf_hook_log数据源一起切，切的数据有问题。

date：2023/10/12 15:00 version 3.4.16
修复大文件切割的相关问题，修复ebpf和hiperf时间切割的问题，增加文本格式hilog的切割功能。新增动效名称。

date：2023/10/19 20:00 version 3.5.1
解决文本没有换行符导致最后一行无法解析的问题，应用启动解析方案更新，修复wasm下大型联表查询解析失败问题，删除proto文件标准化脚本，修复cpuprofiler切割数据与源数据不同的问题，thread_state异常数据改为-1。

date: 2023/10/31 14:00 version 3.5.2
1. 解决hiperf源码更新后的编译问题
2. 回退解析hiperf压缩调用栈代码
3. native_hook导入so重新符号化逻辑更新。 
4. 回退hiperf, ebpf导入so重新符号化功能。 
5. 修复 wasm下SQL查询问题， 优化查询效率。
6. raw trace解析逻辑更新
7. clock_set_rate事件不在检查cpu_id字段， 兼容其他数据模式。 
8. 修复hiperf按时间切割时钟源不同步导致切割失败
9. 更新动效解析逻辑
10. 标准化-q, --metrics查询输出结果
11. 解决windows版本运行失败问题。 
12. 修复binder跳转错误
13. 修复metrics查询错误
14. 修复卡顿丢帧连线问题
15. wasm下解析文本数据最后一行没有回车符问题适配

date: 2023/11/02 20:00 version 3.5.3
1. 新增perf可读文本导出功能
2.支持解析hisysevent数据

date: 2023/11/06 15:00 version 3.5.4
1. 支持NativeHook多进程解析
2. 修复perf可读文本格式

date: 2023/11/09 16:30 version 3.5.5
1. 修复列式数据库查询问题
2. 修复hiperf导入so重新符号化
3. 支持解析hiperf调用栈压缩数据
4. wasm下解析数据使用稳定排序算法