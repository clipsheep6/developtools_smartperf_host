import { LitIcon } from "../../base-ui/icon/LitIcon";

export const SpAdvertisementHtml = `<style>
        #sp-advertisement {
          display:block;
          max-width: 400px;
          border-radius: 5px;
          border:1px solid galy;
          box-shadow: 0px 0px 10px #d9d9d9;
          cursor: pointer;
          padding:15px 5px 5px 5px;
          opcity:0.6;
          font-family: "HarmonyOS Sans SC", "Arial", sans-serif;
        }
        #close { 
          position:absolute;
          right:0px;
          top:0px;
          padding:1px 2px;
          border-top-right-radius:5px;
          color:#999;
        }
        #close:hover {
          background-color:#999;
          color:#666;
          font-weight:bold;
        }
        #notice {
          color:red;
          word-wrap: break-word;    
          overflow-wrap: break-word;
          line-height:30px;
          padding-right:15px;
        }
        </style>
        <div class="sp-advertisement" id="sp-advertisement">
            <lit-icon name="close" size="18px" id = "close"></lit-icon>
            <div id="notice">暂无推送消息</div>
        </div>
    `;