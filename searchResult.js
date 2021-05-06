const { ApolloError } = require("apollo-server")
const { default: axios } = require("axios")
const { promisify } = require('util')
require('dotenv').config()
const redis = require('redis')
const { resolve } = require("path")
const redisClient = redis.createClient({
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT
})

const RedisValidation = async (username) => {
    let redis_key = 'search_' + username
    return new Promise((resolve, reject) => {
        redisClient.exists(redis_key, (error, data) => {
            if (error) reject(error)
            resolve(data)
        })
    })
}

const RedisCreation = async (username, dataToSave) => {
    let redis_key = 'search_' + username
    return new Promise((resolve, reject) => {
        redisClient.set(redis_key, JSON.stringify(dataToSave), (error, data) => {
            if (error) reject(error)
            resolve(data)
        })
    })
}

const RedisGet = async (username) => {
    let redis_key = 'search_' + username
    return new Promise((resolve, reject) => {
        redisClient.get(redis_key, (error, data) => {
            if (error) reject(error)
            resolve(JSON.parse(data))
        })
    })
}

exports.findUser = async (obj, args, context, info) => {
    if (!context.username) throw new ApolloError("No autorizado", "UNAUTHORIZED")
    if (!args.username) throw new ApolloError("El nombre de usuario es requerido", "FIELD_REQUIRED")
    let userResult = []
    let username = args.username
    let existe_redis = await RedisValidation(username)
    if (existe_redis == 1) {
        // Retorna la info guardada
        return await RedisGet(username)
    } else {
        // No existe el registro, se hace todo el proceso y se guarda
        let platforms = [
            "origin",
            "psn",
            "xbl"
        ]
        for (i = 0; i < platforms.length; i++) {
            try {
                const resultData = await axios.get(
                    "https://public-api.tracker.gg/v2/apex/standard/search?platform=" + platforms[i] + "&query=" + username + "&autocomplete=true", {
                        headers: {
                            "TRN-Api-Key": process.env.TRACKER_HEADERS
                        }
                    }
                )
                resultData.data.data.forEach((item, index) => {
                    userResult.push({
                        username: item.platformUserIdentifier,
                        platform: item.platformSlug,
                        imageUrl: item.avatarUrl
                    })
                })
            }
            catch (e) {
                console.log("No se encontro al usuario " + username + " en " + platforms[i])
            }
        }
        await RedisCreation(username, userResult)
        return userResult
    }
}