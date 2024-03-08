import { BaseElement, element } from '../BaseElement';
import { replacePlaceholders } from '../utils/Template';
import { LitSelectOption } from './LitSelectOption';
let css = `
<style>
:host{
  display: inline-flex;
  position: relative;
  overflow: visible;
  cursor: pointer;
  border-radius: 2px;
  outline: none;
  -webkit-user-select:none ;
  -moz-user-select:none;
  user-select:none;
}
:host(:not([border])),
:host([border='true']){
  border: 1px solid var(--bark-prompt,#dcdcdc);
}
input{
  border: 0;
  outline: none;
  background-color: transparent;
  cursor: pointer;
  -webkit-user-select:none ;
  -moz-user-select:none;
  user-select:none;
  display: inline-flex;
  color: var(--dark-color2,rgba(0,0,0,0.9));
}
:host([highlight]) input {
  color: rgba(255,255,255,0.9);
}
:host([mode])  input{
  padding: 6px 0px;
}
:host([mode])  .root{
  padding: 1px 8px;
}
.multipleSelect{
  position: relative;
  padding: 3px 6px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-radius: 2px;
  outline: none;
  font-size: 1rem;
  z-index: 98;
  -webkit-user-select:none ;
  -moz-user-select:none;
  user-select:none;
  width: 100%;
  -moz-user-select:none;
  -ms-user-select:none;
  user-select:none;
  -khtml-user-select:none;
  -webkit-touch-callout:none;
  -webkit-user-select:none;
}
.body{
  position: absolute;
  bottom: 100%;
  z-index: 2;
  padding-top: 5px;
  margin-top: 2px;
  background-color: var(--dark-background4,#fff);
  width: 100%;
  transform: scaleY(.6);
  visibility: hidden;
  opacity: 0;
  transform-origin: bottom center;
  display: block;
  flex-direction: column;
}
.body-bottom{
  bottom: auto;
  top: 100%;
  transform-origin: top center;
}
:host([placement="bottom"]) .body{
  bottom:unset;
  top: 100%;
  transition: none;
  transform: none;
}
:host([rounded]) .body {
  border-radius: 16px;
}
:host([rounded]) .root {
  border-radius: 16px;
  height: 25px;
}
.icon{
  pointer-events: none;
}
:host(:not([border]):not([disabled]):focus),
:host([border='true']:not([disabled]):focus),
:host(:not([border]):not([disabled]):hover),
:host([border='true']:not([disabled]):hover){
  border:1px solid var(--bark-prompt,#ccc)
}
:host(:not([disabled]):focus)  input{
  color: var(--dark-color,#bebebe);
}
:host(:not([border])[disabled]) *,
:host([border='true'][disabled]) *{
  background-color: var(--dark-background1,#f5f5f5);
  color: #b7b7b7;
  cursor: not-allowed;
}
:host([border='false'][disabled]) *{
  color: #b7b7b7;
  cursor: not-allowed;
}
.body{
  max-height: 286px;
  box-shadow: 0 5px 15px 0px #00000033;
  border-radius: 10px;
}
input{
  width: 100%;
}
#search-input {
  outline: none;
  border: none;
}
.body-select {
  margin-top: 3px;
  background-color: var(--dark-background4,#fff);
  width: 100%;
  border-bottom: none;
}
.body-opt{
  width: 100%;
  max-height: 256px;
  border-top: none;
  overflow: auto;
  border-bottom-left-radius: 10px;
  border-bottom-right-radius: 10px;
  background-color: var(--dark-background4,#fff);
}
.loading{
  display: none;
}
input::-webkit-input-placeholder {
  color: var(--dark-color,#aab2bd);
}
#search-input{
  margin-left: 15px;
}
.icon{
  display: flex;
}
/*Define the height, width and background of the scroll bar*/
::-webkit-scrollbar{
  width: 8px;
  border-radius: 10px;
  background-color: var(--dark-background3,#FFFFFF);
}
/*define slider*/
::-webkit-scrollbar-thumb{
  border-radius: 6px;
  background-color: var(--dark-background7,rgba(0,0,0,0.1));
}
</style>
`;
const initHtmlStyle = (height: string): string => {
  return replacePlaceholders(css, height);
};
@element('lit-allocation-select')
export class LitAllocationSelect extends BaseElement {
  private selectAllocationInputEl: HTMLInputElement | null | undefined;
  private selectAllocationInputContent: HTMLDivElement | undefined;
  private selectAllocationOptions: any;
  private processDataList: Array<string> = [];
  private selectAllocationSearchInputEl: HTMLInputElement | null | undefined;
  private selectAllocationBody: HTMLDivElement | undefined;
  static get observedAttributes() {
    return ['value', 'disabled', 'placeholder'];
  }
  get defaultPlaceholder() {
    return this.getAttribute('placeholder') || '';
  }
  get placeholder() {
    return this.getAttribute('placeholder') || this.defaultPlaceholder;
  }
  set placeholder(selectAllocationValue) {
    this.setAttribute('placeholder', selectAllocationValue);
  }
  get value() {
    return this.getAttribute('value') || '';
  }
  set value(selectAllocationValue: string) {
    this.setAttribute('value', selectAllocationValue);
  }
  set processData(value: Array<string>) {
    this.processDataList = value;
  }
  get placement(): string {
    return this.getAttribute('placement') || '';
  }
  set placement(selectAllocationValuePlacement: string) {
    if (selectAllocationValuePlacement) {
      this.setAttribute('placement', selectAllocationValuePlacement);
    } else {
      this.removeAttribute('placement');
    }
  }
  get listHeight() {
    return this.getAttribute('list-height') || '256px';
  }
  set listHeight(value) {
    this.setAttribute('list-height', value);
  }
  initElements(): void {
    this.selectAllocationInputContent = this.shadowRoot!.querySelector('.multipleSelect') as HTMLDivElement;
    this.selectAllocationInputEl = this.shadowRoot!.querySelector('#singleInput') as HTMLInputElement;
    this.selectAllocationSearchInputEl = this.shadowRoot!.querySelector('#search-input') as HTMLInputElement;
    this.selectAllocationBody = this.shadowRoot!.querySelector('.body') as HTMLDivElement;
    this.selectAllocationOptions = this.shadowRoot!.querySelector('.body-opt') as HTMLDivElement;
    this.selectAllocationInputEl?.addEventListener('input', (ev) => {
      if (this.selectAllocationInputEl!.value === '00') {
        this.selectAllocationInputEl!.value = '0';
        ev.preventDefault();
      }
      this.value = this.selectAllocationInputEl!.value;
      this.selectAllocationInputContent!.dispatchEvent(new CustomEvent('valuable', {}));
    })
    this.selectAllocationSearchInputEl!.onkeydown = (ev: KeyboardEvent): void => {
      // @ts-ignore
      if (ev.key === '0' && ev.target.value.length === 1 && ev.target.value === '0') {
        ev.preventDefault();
      }
    };
    this.selectAllocationSearchInputEl!.addEventListener('keyup', (ev) => {
      let options = [...this.shadowRoot!.querySelectorAll<LitSelectOption>('.option')];
      options.filter((item: LitSelectOption) => {
        if (item.textContent!.indexOf(this.selectAllocationSearchInputEl!.value) === -1) {
          item.style.display = 'none';
        } else {
          item.style.display = 'flex';
        }
      })
    })
    this.addEventListener('focusout', (e) => {
      this.selectAllocationBody!.style.visibility = 'hidden';
      this.selectAllocationBody!.style.opacity = '0';
    });
  }
  initDataItem(processDataList: Array<string>): void {
    processDataList.forEach((item) => {
      let option = document.createElement('lit-select-option');
      option.className = 'option';
      option.setAttribute('value', item);
      option.textContent = item;
      this.selectAllocationOptions.appendChild(option);
      this.selectAllocationInputEl?.focus();
    });
  }
  optionsClick(): void {
    this.shadowRoot?.querySelectorAll('lit-select-option').forEach((item) => {
      item.addEventListener('onSelected', (e) => {
        this.selectAllocationInputEl!.value = item.textContent!;
        this.value = item.textContent!;
        this.selectAllocationInputContent!.dispatchEvent(new CustomEvent('valuable', {}));
        this.selectAllocationBody!.style.visibility = 'hidden';
        this.selectAllocationBody!.style.opacity = '0';
      })
    })
  }
  initData(): void{
    this.selectAllocationOptions.innerHTML = '';
    if (this.processDataList.length > 0) {
      this.selectAllocationBody!.style.visibility = 'visible';
      this.selectAllocationBody!.style.opacity = '1';
      this.initDataItem(this.processDataList);
      this.optionsClick();
    } else {
      this.selectAllocationBody!.style.visibility = 'hidden';
      this.selectAllocationBody!.style.opacity = '0';
    }
  }
  initHtml(): string {
    return `
        ${initHtmlStyle(this.listHeight)}
        <div class="multipleSelect" tabindex="0" hidefocus="true">
            <div class="multipleRoot" id="select" style="width:100%">
              <input id="singleInput" placeholder="${this.placeholder}" tabindex="0"/>
            </div>
            <lit-icon class="icon" name='down' color="#c3c3c3"></lit-icon>
        </div>
        <div class="body" tabindex="0" hidefocus="true">
           <div class="body-select">
             <input id="search-input" placeholder="Search" tabindex="0">
           </div>
           <div class="body-opt">
             <slot></slot>
             <slot name="footer"></slot>
           </div>
        </div>  
        `;
  }
}