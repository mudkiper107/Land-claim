import {bedrockServer} from "bdsx/launcher";
import * as fs from "fs"
import {exec} from "child_process";
import {events} from "bdsx/event";
import * as config from "./config.json"
import {command} from "bdsx/command";
import {CxxString} from "bdsx/nativetype";

import {CommandPosition} from "bdsx/bds/command";
import {CANCEL} from "bdsx/common";

let claimsDB:any;
let save:any
bedrockServer.afterOpen().then(()=>{
    console.log('[Land_claim] Loading plugin')
    if (!fs.existsSync('./claims.json')){
        exec(`echo [] > claims.json`)
        console.log(`[Land_claim] No database found. Creating one`)
    }
    fs.readFile('./claims.json',(err,data)=>{
        if (err){
            console.log(`[Land_claim] There was an error reading the claims database:`, err)
            return
        }
        console.log(`[Land_claim] Claim database has been loaded`)
        claimsDB = JSON.parse(data.toString())
    })
    save = setInterval(function (){
        fs.writeFile('./claims.json', JSON.stringify(claimsDB), ()=>{
        })
    },1000*60*config.save_interval)
})
events.serverStop.on(()=>{
    clearInterval(save)
    fs.writeFile('./claims.json', JSON.stringify(claimsDB), ()=>{
        console.log(`[Land_claim] Saved claims database`)
    })
})
events.playerJoin.on((ev)=>{
    const player = ev.player
    const find = claimsDB.find((result: { xuid: string; })=>result.xuid===player.getXuid())
    if (find===undefined){
        claimsDB[claimsDB.length] = {
            xuid:player.getXuid(),
            name:player.getName(),
            claims:[],
            claim_amount:0
        }
    }
})
events.entityHurt.on((ev)=>{
    const player = ev.damageSource.getDamagingEntity()
    if (player===null) return
    if (player.isPlayer()){
        if (player.getPermissionLevel() === 2 && config.ops_bypass) return;
        const xuid = player.getXuid()
        const pos = {
            x:ev.entity.getPosition().x,
            z:ev.entity.getPosition().z
        }
        const claim = checkClaimed(pos)
        if (!claim.claimed) return;
        if (claim.place===undefined) return
        if (claimsDB[claim.place].xuid === xuid) return;
        player.sendActionbar(`§cThis land is claimed by ${claimsDB[claim.place].name}`)
        return CANCEL
    }
})
events.blockDestroy.on((ev)=>{
    const player = ev.player
    if (player==null) return
    if (player.isPlayer()){
        if (player.getPermissionLevel() === 2 && config.ops_bypass) return;
        const xuid = player.getXuid()
        const pos = {
            x:ev.blockPos.x,
            z:ev.blockPos.z
        }
        const claim = checkClaimed(pos)
        if (!claim.claimed) return;
        if (claim.place===undefined) return
        if (claimsDB[claim.place].xuid === xuid) return;
        ev.player.sendActionbar(`§cThis land is claimed by ${claimsDB[claim.place].name}`)
        return CANCEL
    }
})
events.blockPlace.on((ev)=>{
    const player = ev.player
    if (player==null) return
    if (player.isPlayer()){
        if (player.getPermissionLevel() === 2 && config.ops_bypass) return;
        const xuid = player.getXuid()
        const pos = {
            x:ev.blockPos.x,
            z:ev.blockPos.z
        }
        const claim = checkClaimed(pos)
        if (!claim.claimed) return;
        if (claim.place===undefined) return
        if (claimsDB[claim.place].xuid === xuid) return;
        ev.player.sendActionbar(`§cThis land is claimed by ${claimsDB[claim.place].name}`)
        return CANCEL

    }
})
events.chestOpen.on((ev)=>{
    const player = ev.player
    if (player==null) return
    if (player.isPlayer()){
        if (player.getPermissionLevel() === 2 && config.ops_bypass) return;
        const xuid = player.getXuid()
        const pos = {
            x:ev.blockPos.x,
            z:ev.blockPos.z
        }
        const claim = checkClaimed(pos)
        if (!claim.claimed) return;
        if (claim.place===undefined) return
        if (claimsDB[claim.place].xuid === xuid) return;
        player.sendActionbar(`§cThis land is claimed by ${claimsDB[claim.place].name}`)
        return CANCEL


    }
})
events.blockInteractedWith.on((ev)=>{
    const player = ev.player
    if (player===null) return
    if (player.isPlayer()){
        if (player.getPermissionLevel() === 2 && config.ops_bypass) return;
        const xuid = player.getXuid()
        const pos = {
            x:ev.blockPos.x,
            z:ev.blockPos.z
        }
        const claim = checkClaimed(pos)
        if (!claim.claimed) return;
        if (claim.place===undefined) return
        if (claimsDB[claim.place].xuid === xuid) return;
        player.sendActionbar(`§cThis land is claimed by ${claimsDB[claim.place].name}`)
        return CANCEL


    }
})
events.itemUseOnBlock.on((ev)=>{
    const player = ev.actor
    if (player===null) return
    if (player.isPlayer()){
        if (player.getPermissionLevel() === 2 && config.ops_bypass) return;
        const xuid = player.getXuid()
        const pos = {
            x:ev.clickX,
            z:ev.clickZ
        }
        const claim = checkClaimed(pos)
        if (!claim.claimed) return;
        if (claim.place===undefined) return
        if (claimsDB[claim.place].xuid === xuid) return;
        player.sendActionbar(`§cThis land is claimed by ${claimsDB[claim.place].name}`)
        return CANCEL


    }
})

command.register(`staffclaim`,'manage staff claims',1).overload((params, origin, output)=>{
    const method = params.method
    if (method==="set") {
        if (params.point1===undefined || params.point2===undefined){
            output.error(`§cEnter a set of coordinates to claim the land`)
            return;
        }
        output.success(setClaim("1","staff", params.point1, params.point2).output)
    } else if (method==='remove'){
        const player = origin.getEntity()
        if (!player?.isPlayer()) return;
        const pos = {
            x:player?.getPosition().x,
            z:player?.getPosition().z
        }
        output.success(removeClaim('1','staff',pos).output)
    }
},{
    method:CxxString,
    point1:[CommandPosition, true],
    point2:[CommandPosition, true]
})


/** Checks if the player owns the land they are in and removes it if they don't.
 * @param xuid The player's xuid
 * @param name The player's name
 * @param pos The player's current position
 * @return a boolean stating if they own the land or not as well as a string with the output message*/
export function removeClaim(xuid:string,name:string,pos:any):{result:boolean,output:string}{
    let place = claimsDB.findIndex((result: { xuid: string; })=>result.xuid===xuid)
    if (place===-1){
        claimsDB[claimsDB.length] = {
            name:name,
            xuid:xuid,
            claims:[],
            claim_amount:0
        }
        return {
            result:false,
            output:"§cYou do not own this claim"
        }
    }
    const claim = checkClaimed(pos)
    if (!claim.claimed)return {
        result:false,
        output:"§cYou do not own this land"
    }
    if (claim.place===undefined || claim.claim_place===undefined) return {result:false, output:"§cThere was an error removing the claim"}
    if (claim.claimed && claimsDB[claim.place].xuid === xuid){
        claimsDB[claim.place].claims.splice(claim.claim_place, 1)
        if (claimsDB[claim.place].claims.length === null) claimsDB[claim.place].claims = []
        claimsDB[claim.place].claim_amount--
        return {
            result:true,
            output:"§cClaim removed"
        }
    }
    return {
        result:false,
        output:"§cYou do not own this land"
    }

}


/** Che
 * @param xuid The player's xuid
 * @param name The player's name
 * @param pos1 The first set of coordinates corresponding to one of the corners of the claim
 * @param pos2 The second set of coordinates corresponding to one of the corners of the claim
 * @return a boolean stating if the claim was successful and a string with the output message*/
export function setClaim(xuid:string,name:string,pos1:any,pos2:any):{result:boolean,output:string}{
    pos1 =  {
        x:Math.floor(pos1.x),
        z:Math.floor(pos1.z)
    }
    pos2 =  {
        x:Math.floor(pos2.x),
        z:Math.floor(pos2.z)
    }
    let place = claimsDB.findIndex((result: { xuid: string; })=>result.xuid===xuid)
    if (place===-1){
        claimsDB[claimsDB.length] = {
            name:name,
            xuid:xuid,
            claims:[],
            claim_amount:0
        }
        place=claimsDB.length
    }
    if (config.claim_limit.limit && config.claim_limit.amount === claimsDB[place].claim_amount && xuid!=="1"){
        return {
            result:false,
            output:"§cYou have reached the max amount of claims"
        }
    }
    if (!checkClaimOverlap(pos1, pos2)){
        let claims = {
            x:0,
            z:0,
            xx:0,
            zz:0
        }
        if (pos1.x>pos2.x){
            claims.x = pos1.x
            claims.xx = pos2.x
        } else {
            claims.xx = pos1.x
            claims.x = pos2.x
        }
        if (pos1.z>pos2.z){
            claims.z = pos1.z
            claims.zz = pos2.z
        } else {
            claims.zz = pos1.z
            claims.z = pos2.z
        }
        claimsDB[place].claims[claimsDB[place].claims.length] = claims
        claimsDB[place].claim_amount++
        return {
            result:true,
            output:"§aSuccessfully set land claim"
        }
    }
    return {
        result:false,
        output:"§cThis claim overlaps another"
    }

}
/**Checks if one claim overlaps with another
 * @return boolean if the claims overlap or not*/
function checkClaimOverlap(pos1: any, pos2: any):boolean{
    for (let x=0;x<claimsDB.length;x++){
        let claim = claimsDB[x].claims.find((result: { x: number; z: number; xx: number; zz: number; })=>result.x >= pos1.x && result.z >= pos1.z && result.xx <= pos2.x &&  result.zz <= pos2.z )
        if (claim !== undefined){
            return true
        }
    }
    return false

}
/**Checks if the position is in a claim
 * @return a boolean with a value of false if not claimed and true if it is claimed. If it is claimed it will return the claim info,
 * the index of the user whose claimed it and the index of their claim*/
function checkClaimed(pos1: any):{claimed:boolean,place?:number,claim_place?:number}{
    for (let x=0;x<claimsDB.length;x++){
        let claim = claimsDB[x].claims.find((result: { x: number; z: number; xx: number; zz: number; })=>result.x >= pos1.x && result.z >= pos1.z && result.xx <= pos1.x && result.zz <= pos1.z)
        if (claim !== undefined){
            const claim_place = claimsDB[x].claims.findIndex((result: { x: number; z: number; xx: number; zz: number; })=>result.x >= pos1.x && result.z >= pos1.z && result.xx <= pos1.x && pos1.z >= result.zz)
            return {claimed:true,place:x,claim_place:claim_place}
        }
    }
    return {claimed:false}
}