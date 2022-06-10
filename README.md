
# Land Claim API
Allows for land claiming to be implemented into bdsx. This was made to be added to existing plugins like economy and such
####
This plugin adds 3 functions `setClaim`, `removeClaim`, and `checkClaimed` which set, remove or check if a position is claimed
####
Example usage
```ts
import {command} from "bdsx/command";
import {CxxString} from "bdsx/nativetype";
import {CommandPosition} from "bdsx/bds/command";
import {removeClaim, setClaim} from "./plugins/land_claim/index";

command.register(`claim`,'claim land').overload((params, origin, output)=>{
    const method = params.method
    if (method==="set") {
        const player = origin.getEntity()
        if (!player?.isPlayer()) return;
        if (params.point1===undefined || params.point2===undefined){
            output.error(`§cEnter a set of coordinates to claim the land`)
            return;
        }
        
        output.success(setClaim(player.getXuid(),player?.getName(), params.point1, params.point2).output)
    } else if (method==='remove'){
        const player = origin.getEntity()
        if (!player?.isPlayer()) return;
        const pos = {
            x:player?.getPosition().x,
            z:player?.getPosition().z
        }
        output.success(removeClaim(player.getXuid(),player?.getName(),pos).output)
    }
},{
    method:CxxString,
    point1:[CommandPosition, true],
    point2:[CommandPosition, true]
})
```
In the config.json file you are able to set how often the claim db is saved, if players with operator can bypass land claims as well as the limit of land claims players can have 
```json
{
  "save_interval": 10, 
  "ops_bypass": false,
  "claim_limit": {
    "limit": true,
    "amount": 5
  }
}
```
If you find any bugs or suggest any improvements let me know on discord. mudkiper107#8390
