const { ApolloError } = require("apollo-server")
const { default: axios } = require("axios")
const AWS = require("aws-sdk")
const { v4: uuidv4 } = require('uuid');
const moment = require("moment");
require('dotenv').config()
const redis = require('redis')
const { resolve } = require("path")
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
})

AWS.config.update({
    region: process.env.AWS_REGION,
    endpoint: process.env.AWS_ENDPOINT
})

let docClient = new AWS.DynamoDB.DocumentClient();
let ddb = new AWS.DynamoDB({apiVersion: '2012-08-10'})

const RedisValidation = async (username, platform) => {
    let redis_key = 'user_' + username + '_' + platform
    return new Promise((resolve, reject) => {
        redisClient.exists(redis_key, (error, data) => {
            if (error) reject(error)
            resolve(data)
        })
    })
}

const RedisCreation = async (username, platform, dataToSave) => {
    let redis_key = 'user_' + username + '_' + platform
    return new Promise((resolve, reject) => {
        redisClient.set(redis_key, JSON.stringify(dataToSave), 'EX', 60 * 5, (error, data) => {
            if (error) reject(error)
            resolve(data)
        })
    })
}

const RedisGet = async (username, platform) => {
    let redis_key = 'user_' + username + '_' + platform
    return new Promise((resolve, reject) => {
        redisClient.get(redis_key, (error, data) => {
            if (error) reject(error)
            resolve(JSON.parse(data))
        })
    })
}

exports.GetApexUser = async (obj, args, context, info) => {
    if (!context.username) throw new ApolloError("No autorizado", "UNAUTHORIZED")
    const {
        username,
        platform
    } = args
    if (!username) throw new ApolloError("El nombre de usuario es requerido", "FIELD_REQUIRED")
    if (!platform) throw new ApolloError("La plataforma es requerida", "FIELD_REQUIRED")
    let db_user_id = ""
    let legends_ids = []
    let ranked_history_ids = []
    let exists_redis = await RedisValidation(username, platform)
    if (exists_redis == 1) {
        let user_cache = await RedisGet(username, platform)
        let apexLegendsKeys = []
        let apexRankedKeys = []
        user_cache.legends.forEach(item => {
            apexLegendsKeys.push({
                id: item
            })
        })
        user_cache.rankeds.forEach(item => {
            apexRankedKeys.push({
                id: item
            })
        })
        let userInfo = await docClient.batchGet({
            RequestItems: {
                'overwex-apex-user': {
                    Keys: [
                        {
                            id: user_cache.userId
                        }
                    ]
                },
                'overwex-apex-legends': {
                    Keys: apexLegendsKeys
                },
                'overwex-apex-rank-history': {
                    Keys: apexRankedKeys
                }
            }
        }).promise()
        let apex_legends_return = []
        userInfo.Responses['overwex-apex-legends'].forEach(item => {
            apex_legends_return.push({
                name: item.name,
                imageUrl: item.imageUrl,
                tallImageUrl: item.tallImageUrl,
                bgImageUrl: item.bgImageUrl,
                kills: item.kills,
                isSelected: item.isSelected
            })
        })
        let apex_legends_rankeds = []
        userInfo.Responses['overwex-apex-rank-history'].forEach(item => {
            apex_legends_rankeds.push({
                rankName: item.rankName,
                rankValue: item.rankValue,
                rankIconUrl: item.rankIcon,
                fechaRegistrado: moment.unix(item.recordDate).format('dddd MMMM Do YYYY, h:mm:ss a'),
                fechaUnix: item.recordDate
            })
        })
        apex_legends_rankeds.sort((a, b) => {
            return parseFloat(a.fechaUnix) - parseFloat(b.fechaUnix)
        })
        return {
            username: username,
            platform: platform,
            imageUrl: userInfo.Responses['overwex-apex-user'][0].imageUrl,
            kills: userInfo.Responses['overwex-apex-user'][0].kills,
            level: userInfo.Responses['overwex-apex-user'][0].level,
            legends: apex_legends_return,
            rankHistory: apex_legends_rankeds,
        }
    } else {
        let apex_legends = []
        try {
            let apexUserScan = await docClient.scan({
                TableName: "overwex-apex-user",
                FilterExpression: "username = :user and platform = :platform",
                ExpressionAttributeValues: {
                    ":user": username,
                    ":platform": platform
                }
            }).promise()
            let imageUrl, kills, level = ""
            let rankName, rankValue, rankIconUrl = ""
            let shouldSaveRank = false
            let apex_legends_list = []
            let apexUserResult = await axios.get(
                "https://public-api.tracker.gg/v2/apex/standard/profile/" + platform + "/" + username, {
                    headers: {
                        "TRN-Api-Key": process.env.TRACKER_HEADERS
                    }
                }
            )
            imageUrl = apexUserResult.data.data.platformInfo.avatarUrl
            apexUserResult.data.data.segments.forEach(item => {
                if (item.type === "overview") {
                    level = item.stats.level.value
                    kills = item.stats.kills.value
                    if (item.stats.rankScore) {
                        if (item.stats.rankScore.metadata) {
                            if (item.stats.rankScore.metadata.rankName) {
                                rankName = item.stats.rankScore.metadata.rankName
                                rankIconUrl = item.stats.rankScore.metadata.iconUrl
                                rankValue = item.stats.rankScore.value
                                shouldSaveRank = true
                            }
                        }
                    }
                } else if (item.type === "legend") {
                    let legend = {
                        username: {
                            S: username
                        },
                        platform: {
                            S: platform
                        },
                        id: {
                            S: uuidv4()
                        },
                        name: {
                            S: item.metadata.name
                        },
                        imageUrl: {
                            S: item.metadata.imageUrl
                        },
                        tallImageUrl: {
                            S: item.metadata.tallImageUrl
                        },
                        bgImageUrl: {
                            S: item.metadata.bgImageUrl
                        },
                        isSelected: {
                            BOOL: item.metadata.isActive
                        }
                    }
                    if (item.stats.kills) 
                        legend.kills = {
                            N : `${item.stats.kills.value}`
                        }
                    apex_legends_list.push(legend)
                }
            })
            if (apexUserScan.Count == 0) {
                // Guarda el usuario de Apex
                let id_generado = uuidv4()
                await ddb.putItem({
                    Item: {
                        "id": {
                            S: id_generado
                        }, 
                        "username": {
                            S: username
                        },
                        "platform": {
                            S: platform
                        },
                        "imageUrl": {
                            S: imageUrl
                        },
                        "kills": {
                            N: `${kills}`
                        },
                        "level": {
                            N: `${level}`
                        }
                    },
                    TableName: "overwex-apex-user"
                }).promise()
                db_user_id = id_generado
            } else {
                db_user_id = apexUserScan.Items[0].id
                await docClient.update({
                    TableName: "overwex-apex-user",
                    Key: {
                        "id": apexUserScan.Items[0].id
                    },
                    UpdateExpression: "set imageUrl = :imageurl, kills = :kills, #lvl = :level",
                    ExpressionAttributeValues: {
                        ":imageurl": imageUrl,
                        ":kills": `${kills}`,
                        ":level": `${level}`
                    },
                    ExpressionAttributeNames: {
                        "#lvl": "level"
                    }
                }).promise()
            }
            if (apex_legends_list.length > 0) {
                let item_exists = await docClient.scan({
                    TableName: 'overwex-apex-legends',
                    FilterExpression: "username = :user and platform = :platform",
                    ExpressionAttributeValues: {
                        ":user": username,
                        ":platform": platform
                    }
                }).promise()
                for (i = 0; i < apex_legends_list.length; i++) {
                    let new_legend_item = {
                        name: apex_legends_list[i].name.S,
                        imageUrl: apex_legends_list[i].imageUrl.S,
                        tallImageUrl: apex_legends_list[i].tallImageUrl.S,
                        bgImageUrl: apex_legends_list[i].bgImageUrl.S,
                        isSelected: apex_legends_list[i].isSelected.BOOL
                    }
                    if (apex_legends_list[i].kills) {
                        new_legend_item.kills = apex_legends_list[i].kills.N
                    }
                    apex_legends.push(new_legend_item)
                    let id_act = ""
                    let found_legend = false
                    for (j = 0; j < item_exists.Items.length; j++) {
                        if (apex_legends_list[i].name.S === item_exists.Items[j].name) {
                            found_legend = true
                            id_act = item_exists.Items[j].id
                            j = item_exists.Items.length
                        }
                    }
                    if (found_legend) {
                        let expAtt = {
                            ":newIsSel": apex_legends_list[i].isSelected.BOOL
                        }
                        if (apex_legends_list[i].kills)
                            expAtt[":newKills"] = apex_legends_list[i].kills.N
                        await docClient.update({
                            TableName: "overwex-apex-legends",
                            Key: {
                                "id": id_act
                            },
                            UpdateExpression: "set isSelected = :newIsSel" + (apex_legends_list[i].kills ? ", kills = :newKills" : ""),
                            ExpressionAttributeValues: expAtt
                        }).promise()
                        legends_ids.push(id_act)
                    }
                    else {
                        await ddb.putItem({
                            TableName: "overwex-apex-legends",
                            Item: apex_legends_list[i]
                        }).promise()
                        legends_ids.push(apex_legends_list[i].id.S)
                    }
                }
                if (item_exists.Count > 0) {
                    for (i = 0; i < item_exists.Items.length; i++) {
                        let existe_en_lista = false
                        for (j = 0; j < apex_legends.length; j++)
                            if (item_exists.Items[i].name === apex_legends[j].name) {
                                existe_en_lista = true
                                j = apex_legends.length
                            }
                        if (!existe_en_lista)
                            apex_legends.push({
                                name: item_exists.Items[i].name,
                                imageUrl: item_exists.Items[i].imageUrl,
                                tallImageUrl: item_exists.Items[i].tallImageUrl,
                                bgImageUrl: item_exists.Items[i].bgImageUrl,
                                kills: item_exists.Items[i].kills,
                                isSelected: item_exists.Items[i].isSelected
                            })
                    }
                }
            }
            if (shouldSaveRank) {
                await ddb.putItem({
                    TableName: "overwex-apex-rank-history",
                    Item: {
                        id: {
                            S: uuidv4()
                        },
                        username: {
                            S: username
                        },
                        platform: {
                            S: platform
                        },
                        rankName: {
                            S: rankName
                        },
                        rankIcon: {
                            S: rankIconUrl
                        },
                        rankValue: {
                            N: `${rankValue}`
                        },
                        recordDate: {
                            N: `${moment().unix()}`
                        }
                    }
                }).promise()
            }
            let return_rank_history = []
            let rankHistoryResult = await docClient.scan({
                TableName: "overwex-apex-rank-history",
                FilterExpression: "username = :user and platform = :platform",
                ExpressionAttributeValues: {
                    ":user": username,
                    ":platform": platform
                },
                ProjectionExpression: "id, rankName, rankIcon, rankValue, recordDate"
            }).promise()
            rankHistoryResult.Items.forEach(item => {
                return_rank_history.push({
                    rankName: item.rankName,
                    rankValue: item.rankValue,
                    rankIconUrl: item.rankIcon,
                    fechaRegistrado: moment.unix(item.recordDate).format('dddd MMMM Do YYYY, h:mm:ss a'),
                    fechaUnix: item.recordDate
                })
                ranked_history_ids.push(item.id)
            })
            return_rank_history.sort((a, b) => {
                return parseFloat(a.fechaUnix) - parseFloat(b.fechaUnix)
            })
            RedisCreation(username, platform, {
                userId: db_user_id,
                legends: legends_ids,
                rankeds: ranked_history_ids
            })
            return {
                username: username,
                platform: platform,
                imageUrl: imageUrl,
                kills: kills,
                level: level,
                legends: apex_legends,
                rankHistory: return_rank_history,
            }
        } catch (e) {
            throw new ApolloError(e, "ERROR")
        }
    }
    
}