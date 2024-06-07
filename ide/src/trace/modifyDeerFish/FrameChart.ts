export class FrameChart extends BaseElement {
  private canvas!: HTMLCanvasElement;
  private canvasContext!: CanvasRenderingContext2D;
  private floatHint!: HTMLDivElement | undefined | null; 
  private rect: Rect = new Rect(0, 0, 0, 0);
  private _mode = ChartMode.Byte;
  private canvasX = -1; 
  private canvasY = -1; 
  private hintContent = ''; 
  private rootNode!: ChartStruct;
  private currentData: Array<ChartStruct> = [];
  private xPoint = 0; 
  private canvasScrollTop = 0; 
  private _maxDepth = 0;
  private isClickMode = false; 
  set data(val: Array<ChartStruct>) {
    ChartStruct.lastSelectFuncStruct = undefined;
    this.setSelectStatusRecursive(ChartStruct.selectFuncStruct, true);
    ChartStruct.selectFuncStruct = undefined;
    this.isClickMode = false;
    this.currentData = val;
    this.resetTrans();
    this.calDrawArgs(true);
  }
  private getNodeValue(node: ChartStruct): number {
    switch (this._mode) {
      case ChartMode.Byte:
        return node.drawSize || node.size;
      case ChartMode.Count:
        return node.drawCount || node.count;
      case ChartMode.Duration:
        return node.drawDur || node.dur;
      case ChartMode.EventCount:
        return node.drawEventCount || node.eventCount;
    }
  }
  private createRootNode(): void {
    this.rootNode = new ChartStruct();
    this.rootNode.symbol = 'root';
    this.rootNode.depth = 0;
    this.rootNode.percent = 1;
    this.rootNode.frame = new Rect(0, scaleHeight, this.canvas!.width, depthHeight);
    for (const node of this.currentData!) {
      this.rootNode.children.push(node);
      this.rootNode.count += node.drawCount || node.count;
      this.rootNode.size += node.drawSize || node.size;
      this.rootNode.dur += node.drawDur || node.dur;
      this.rootNode.eventCount += node.drawEventCount || node.eventCount;
      node.parent = this.rootNode;
    }
  }
  private calDrawArgs(initRoot: boolean): void {
    this._maxDepth = 0;
    if (initRoot) {
      this.createRootNode();
    }
    this.initData(this.rootNode, 0, true);
    this.selectInit();
    this.setRootValue();
    this.rect.width = this.canvas!.width;
    this.rect.height = (this._maxDepth + 1) * depthHeight + scaleHeight;
    this.canvas!.style.height = `${this.rect!.height}px`;
    this.canvas!.height = Math.ceil(this.rect!.height);
  }
  private selectInit(): void {
    const node = ChartStruct.selectFuncStruct;
    if (node) {
      const module = new NodeValue();
      node.drawCount = 0;
      node.drawDur = 0;
      node.drawSize = 0;
      node.drawEventCount = 0;
      for (let child of node.children) {
        node.drawCount += child.searchCount;
        node.drawDur += child.searchDur;
        node.drawSize += child.searchSize;
        node.drawEventCount += child.searchEventCount;
      }
      module.count = node.drawCount = node.drawCount || node.count;
      module.dur = node.drawDur = node.drawDur || node.dur;
      module.size = node.drawSize = node.drawSize || node.size;
      module.eventCount = node.drawEventCount = node.drawEventCount || node.eventCount;
      this.setParentDisplayInfo(node, module, true);
      this.setChildrenDisplayInfo(node);
      this.clearOtherDisplayInfo(this.rootNode);
    }
  }
  private clearOtherDisplayInfo(node: ChartStruct): void {
    for (const children of node.children) {
      if (children.isChartSelect) {
        this.clearOtherDisplayInfo(children);
        continue;
      }
      children.drawCount = 0;
      children.drawEventCount = 0;
      children.drawSize = 0;
      children.drawDur = 0;
      this.clearOtherDisplayInfo(children);
    }
  }
  private setRootValue(): void {
    let currentValue = '';
    let currentValuePercent = 1;
    switch (this._mode) {
      case ChartMode.Byte:
        currentValue = Utils.getBinaryByteWithUnit(this.total);
        currentValuePercent = this.total / this.rootNode.size;
        break;
      case ChartMode.Count:
        currentValue = `${this.total}`;
        currentValuePercent = this.total / this.rootNode.count;
        break;
      case ChartMode.Duration:
        currentValue = Utils.getProbablyTime(this.total);
        currentValuePercent = this.total / this.rootNode.dur;
        break;
      case ChartMode.EventCount:
        currentValue = `${this.total}`;
        currentValuePercent = this.total / this.rootNode.eventCount;
        break;
    }
    let endStr = currentValuePercent ? ` (${(currentValuePercent * 100).toFixed(2)}%)` : '';
    this.rootNode.symbol = `Root : ${currentValue}${endStr}`;
  }
  private isJsStack(str: string): boolean {
    let keyList = jsStackPath;
    if (this._mode === ChartMode.Count || this._mode === ChartMode.EventCount) {
      keyList = jsStackPath.concat(jsHapKeys);
    }
    for (const format of keyList) {
      if (str.indexOf(format) > 0) {
        return true;
      }
    }
    return false;
  }
  private clearSuperfluousParams(node: ChartStruct): void {
    node.id = undefined;
    node.eventType = undefined;
    node.parentId = undefined;
    node.title = undefined;
    node.eventType = undefined;
    if (this.mode === ChartMode.Byte) {
      node.self = undefined;
      node.eventCount = 0;
    }
    if (this._mode !== ChartMode.Count && this._mode !== ChartMode.EventCount) {
      node.eventCount = 0;
      node.eventPercent = undefined;
    }
  }
  private initData(node: ChartStruct, depth: number, calDisplay: boolean): void {
    node.depth = depth;
    depth++;
    this.clearSuperfluousParams(node);
    if (this.isJsStack(node.lib)) {
      node.isJsStack = true;
    } else {
      node.isJsStack = false;
    }
    this.clearDisplayInfo(node);
    if (node.isSearch && calDisplay) {
      const module = new NodeValue();
      module.size = node.drawSize = node.searchSize = node.size;
      module.count = node.drawCount = node.searchCount = node.count;
      module.dur = node.drawDur = node.searchDur = node.dur;
      module.eventCount = node.drawEventCount = node.searchEventCount = node.eventCount;
      this.setParentDisplayInfo(node, module, false);
      calDisplay = false;
    }
    if (node.children && node.children.length > 0) {
      for (const children of node.children) {
        children.parent = node;
        this.initData(children, depth, calDisplay);
      }
    } else {
      this._maxDepth = Math.max(depth, this._maxDepth);
    }
  }
  private setParentDisplayInfo(node: ChartStruct, module: NodeValue, isSelect?: boolean): void {
    const parent = node.parent;
    if (parent) {
      if (isSelect) {
        parent.isChartSelect = true;
        parent.isChartSelectParent = true;
        parent.drawCount = module.count;
        parent.drawDur = module.dur;
        parent.drawSize = module.size;
        parent.drawEventCount = module.eventCount;
      } else {
        parent.searchCount += module.count;
        parent.searchDur += module.dur;
        parent.searchSize += module.size;
        parent.searchEventCount += module.eventCount;
        if (!this.isClickMode) {
          parent.drawDur = parent.searchDur;
          parent.drawCount = parent.searchCount;
          parent.drawSize = parent.searchSize;
          parent.drawEventCount = parent.searchEventCount;
        }
      }
      this.setParentDisplayInfo(parent, module, isSelect);
    }
  }
  private setChildrenDisplayInfo(node: ChartStruct): void {
    if (node.children.length < 0) {
      return;
    }
    for (const children of node.children) {
      children.drawCount = children.searchCount || children.count;
      children.drawDur = children.searchDur || children.dur;
      children.drawSize = children.searchSize || children.size;
      children.drawEventCount = children.searchEventCount || children.eventCount;
      this.setChildrenDisplayInfo(children);
    }
  }
  private clearDisplayInfo(node: ChartStruct): void {
    node.drawCount = 0;
    node.drawDur = 0;
    node.drawSize = 0;
    node.drawEventCount = 0;
    node.searchCount = 0;
    node.searchDur = 0;
    node.searchSize = 0;
    node.searchEventCount = 0;
  }
  public async calculateChartData(): Promise<void> {
    this.clearCanvas();
    this.canvasContext?.beginPath();
    this.canvasContext.font = textStyle;
    this.drawCalibrationTails();
    draw(this.canvasContext, this.rootNode);
    this.setFrameData(this.rootNode);
    this.drawFrameChart(this.rootNode);
    this.canvasContext?.closePath();
  }
  public clearCanvas(): void {
    this.canvasContext?.clearRect(0, 0, this.canvas!.width, this.canvas!.height);
  }
  public updateCanvas(updateWidth: boolean, newWidth?: number): void {
    if (this.canvas instanceof HTMLCanvasElement) {
      this.canvas.style.width = `${100}%`;
      this.canvas.style.height = `${this.rect!.height}px`;
      if (this.canvas.clientWidth === 0 && newWidth) {
        this.canvas.width = newWidth - depthHeight * 2;
      } else {
        this.canvas.width = this.canvas.clientWidth;
      }
      this.canvas.height = Math.ceil(this.rect!.height);
      this.updateCanvasCoord();
    }
    if (
      this.rect.width === 0 ||
      updateWidth ||
      Math.round(newWidth!) !== this.canvas!.width + depthHeight * 2 ||
      newWidth! > this.rect.width
    ) {
      this.rect.width = this.canvas!.width;
    }
  }
  private updateCanvasCoord(): void {
    if (this.canvas instanceof HTMLCanvasElement) {
      this.isUpdateCanvas = this.canvas.clientWidth !== 0;
      if (this.canvas.getBoundingClientRect()) {
        const box = this.canvas.getBoundingClientRect();
        const D = document.documentElement;
        this.startX = box.left + Math.max(D.scrollLeft, document.body.scrollLeft) - D.clientLeft;
        this.startY = box.top + Math.max(D.scrollTop, document.body.scrollTop) - D.clientTop + this.canvasScrollTop;
      }
    }
  }
  private drawCalibrationTails(): void {
    const spApplication = <SpApplication>document.getElementsByTagName('sp-application')[0];
    this.canvasContext!.lineWidth = 0.5;
    this.canvasContext?.moveTo(0, 0);
    this.canvasContext?.lineTo(this.canvas!.width, 0);
    for (let i = 0; i <= 10; i++) {
      let startX = Math.floor((this.canvas!.width / 10) * i);
      for (let j = 0; j < 10; j++) {
        this.canvasContext!.lineWidth = 0.5;
        const startItemX = startX + Math.floor((this.canvas!.width / 100) * j);
        this.canvasContext?.moveTo(startItemX, 0);
        this.canvasContext?.lineTo(startItemX, 10);
      }
      if (i === 0) {
        continue;
      }
      this.canvasContext!.lineWidth = 1;
      const sizeRatio = this.canvas!.width / this.rect.width; 
      if (spApplication.dark) {
        this.canvasContext!.strokeStyle = '#888';
      } else {
        this.canvasContext!.strokeStyle = '#ddd';
      }
      this.canvasContext?.moveTo(startX, 0);
      this.canvasContext?.lineTo(startX, this.canvas!.height);
      if (spApplication.dark) {
        this.canvasContext!.fillStyle = '#fff';
      } else {
        this.canvasContext!.fillStyle = '#000';
      }
      let calibration = '';
      switch (this._mode) {
        case ChartMode.Byte:
          calibration = Utils.getByteWithUnit(((this.total * sizeRatio) / 10) * i);
          break;
        case ChartMode.Duration:
          calibration = Utils.getProbablyTime(((this.total * sizeRatio) / 10) * i);
          break;
        case ChartMode.EventCount:
        case ChartMode.Count:
          calibration = `${Math.ceil(((this.total * sizeRatio) / 10) * i)}`;
          break;
      }
      const size = this.canvasContext!.measureText(calibration).width;
      this.canvasContext?.fillText(calibration, startX - size - 5, depthHeight, textMaxWidth);
      this.canvasContext?.stroke();
    }
  }
  private setFrameData(node: ChartStruct): void {
    if (node.children.length > 0) {
      for (const children of node.children) {
        node.isDraw = false;
        if (this.isClickMode && ChartStruct.selectFuncStruct) {
          if (!children.isChartSelect) {
            if (children.frame) {
              children.frame.x = this.rootNode.frame?.x || 0;
              children.frame.width = 0;
              children.percent = 0;
            } else {
              children.frame = new Rect(0, 0, 0, 0);
            }
            this.setFrameData(children);
            continue;
          }
        }
        const childrenValue = this.getNodeValue(children);
        setFuncFrame(children, this.rect, this.total, this._mode);
        children.percent = childrenValue / this.total;
        this.setFrameData(children);
      }
    }
  }
  private calEffectNode(node: ChartStruct, effectChildList: Array<ChartStruct>): number {
    const ignore = new NodeValue();
    for (const children of node.children) {
      if (children.frame!.width >= filterPixel) {
        effectChildList.push(children);
      } else {
        if (node.isChartSelect || this.isSearch(node)) {
          ignore.size += children.drawSize;
          ignore.count += children.drawCount;
          ignore.dur += children.drawDur;
          ignore.eventCount += children.drawEventCount;
        } else {
          ignore.size += children.size;
          ignore.count += children.count;
          ignore.dur += children.dur;
          ignore.eventCount += children.eventCount;
        }
      }
    }
    switch (this._mode) {
      case ChartMode.Byte:
        return ignore.size;
      case ChartMode.Count:
        return ignore.count;
      case ChartMode.Duration:
        return ignore.dur;
      case ChartMode.EventCount:
        return ignore.eventCount;
    }
  }
  private isSearch(node: ChartStruct): boolean {
    switch (this._mode) {
      case ChartMode.Byte:
        return node.searchSize > 0;
      case ChartMode.Count:
        return node.searchCount > 0;
      case ChartMode.Duration:
        return node.searchDur > 0;
      case ChartMode.EventCount:
        return node.searchEventCount > 0;
    }
  }
  private drawFrameChart(node: ChartStruct): void {
    const effectChildList: Array<ChartStruct> = [];
    const nodeValue = this.getNodeValue(node);
    if (node.children && node.children.length > 0) {
      const ignoreValue = this.calEffectNode(node, effectChildList);
      let x = node.frame!.x;
      if (effectChildList.length > 0) {
        for (let children of effectChildList) {
          children.frame!.x = x;
          const childrenValue = this.getNodeValue(children);
          children.frame!.width = (childrenValue / (nodeValue - ignoreValue)) * node.frame!.width;
          x += children.frame!.width;
          if (this.nodeInCanvas(children)) {
            draw(this.canvasContext!, children);
            this.drawFrameChart(children);
          }
        }
      } else {
        const firstChildren = node.children[0];
        firstChildren.frame!.x = node.frame!.x;
        firstChildren.frame!.width = node.frame!.width * (ignoreValue / nodeValue);
        draw(this.canvasContext!, firstChildren);
        this.drawFrameChart(firstChildren);
      }
    }
  }
  private searchDataByCoord(nodes: Array<ChartStruct>, canvasX: number, canvasY: number): ChartStruct | null {
    for (const node of nodes) {
      if (node.frame?.contains(canvasX, canvasY)) {
        return node;
      } else {
        const result = this.searchDataByCoord(node.children, canvasX, canvasY);
        if (!result) {
          continue;
        }
        return result;
      }
    }
    return null;
  }
  private showTip(): void {
    this.floatHint!.innerHTML = this.hintContent;
    this.floatHint!.style.display = 'block';
    let x = this.canvasX;
    let y = this.canvasY - this.canvasScrollTop;
    if (this.canvasX + this.floatHint!.clientWidth > (this.canvas?.clientWidth || 0)) {
      x -= this.floatHint!.clientWidth - 1;
    } else {
      x += scaleHeight;
    }
    if (y > this.floatHint!.clientHeight) {
      y -= this.floatHint!.clientHeight - 1;
    }
    this.floatHint!.style.transform = `translate(${x}px,${y}px)`;
  }
  private setSelectStatusRecursive(node: ChartStruct | undefined, isSelect: boolean): void {
    if (!node) {
      return;
    }
    node.isChartSelect = isSelect;
    const stack: ChartStruct[] = [node]; 
    while (stack.length > 0) {
      const currentNode = stack.pop();
      if (currentNode) {
        currentNode.children.forEach((child) => {
          child.isChartSelect = isSelect;
          stack.push(child);
        });
      }
    }
    while (node?.parent) {
      node.parent.isChartSelect = isSelect;
      node.parent.isChartSelectParent = isSelect;
      node = node.parent;
    }
  }
  private scale(index: number): void {
    let newWidth = 0;
    let deltaWidth = this.rect!.width * scaleRatio;
    const ratio = 1 + scaleRatio;
    if (index > 0) {
      newWidth = this.rect!.width + deltaWidth;
      const sizeRatio = this.canvas!.width / this.rect.width; 
      switch (this._mode) {
        case ChartMode.Byte:
        case ChartMode.Count:
        case ChartMode.EventCount:
          if (Math.round((this.total * sizeRatio) / ratio) <= 10) {
            if (this.xPoint === 0) {
              return;
            }
            newWidth = this.canvas!.width / (10 / this.total);
          }
          break;
        case ChartMode.Duration:
          if (Math.round((this.total * sizeRatio) / ratio) <= ms10) {
            if (this.xPoint === 0) {
              return;
            }
            newWidth = this.canvas!.width / (ms10 / this.total);
          }
          break;
      }
      deltaWidth = newWidth - this.rect!.width;
    } else {
      newWidth = this.rect!.width - deltaWidth;
      if (newWidth < this.canvas!.width) {
        newWidth = this.canvas!.width;
        this.resetTrans();
      }
      deltaWidth = this.rect!.width - newWidth;
    }
    if (newWidth === this.rect.width) {
      return;
    }
    this.translationByScale(index, deltaWidth, newWidth);
  }
}
