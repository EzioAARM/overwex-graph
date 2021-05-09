const { describe, it } = require('mocha')
const chai = require('chai')
const { makeExecutableSchema } = require('graphql-tools')
const typeDefs = require('../typeDefs')
const resolvers = require('../resolvers')
const EasyGraphQlTester = require('easygraphql-tester')
const { expect } = require('chai')
const { Query } = require('../resolvers')

const schema = makeExecutableSchema({
    typeDefs: typeDefs,
    resolvers: resolvers
})

describe('Test querys', () => {
    let tester
    before(() => {
        tester = new EasyGraphQlTester(typeDefs, resolvers)
    })
    
    it('Debe fallar ya que no incluye usuario en el contexto (no esta autorizado)', async () => {
        const searchUserQuery = `
        query {
            SearchResultApexUsers (username: "EzioA") {
                username,
                platform,
                imageUrl
            }
        }`
        const args = {
            username: 'EzioA'
        }
        const result = await tester.graphql(searchUserQuery, {}, {}, args)
        expect(result).to.have.property('errors')
        expect(result.errors.length).to.be.greaterThan(0)
        expect(result.errors[0].message).to.equal('No autorizado')
    })

    it('Debe ser correcta la busqueda del usuario', async () => {
        const searchUserQuery = `
        query {
            SearchResultApexUsers (username: "EzioA") {
                username,
                platform,
                imageUrl
            }
        }`
        const args = {
            username: 'EzioA'
        }
        const result = await tester.graphql(searchUserQuery, {}, {
            username: 'EzioA'
        }, args)
        expect(result.data.SearchResultApexUsers).to.be.an('array')
        expect(result.data.SearchResultApexUsers.length).to.be.greaterThan(0)
        expect(result.data.SearchResultApexUsers[0]).to.be.an('object')
        expect(result.data.SearchResultApexUsers[0]).to.have.property('username')
        expect(result.data.SearchResultApexUsers[0]).to.have.property('platform')
        expect(result.data.SearchResultApexUsers[0]).to.have.property('imageUrl')
    })
    
    it('Debe ser correcta la obtencion de un usuario', async () => {
        const searchUserQuery = `
        query {
            ApexUserProfile (username: "EzioAARM", platform: "origin") {
                username,
                platform,
                imageUrl,
                kills,
                level,
                legends {
                    name,
                    imageUrl,
                    tallImageUrl,
                    bgImageUrl,
                    kills,
                    isSelected
                },
                rankHistory {
                    rankName,
                    rankValue,
                    rankIconUrl,
                    fechaRegistrado,
                    fechaUnix
                }
            }
        }`
        const args = {
            username: 'EzioA'
        }
        const result = await tester.graphql(searchUserQuery, {}, {
            username: 'EzioA'
        }, args)
        expect(result.data.ApexUserProfile).to.be.an('object')
        expect(result.data.ApexUserProfile).to.have.property('username')
        expect(result.data.ApexUserProfile).to.have.property('platform')
        expect(result.data.ApexUserProfile).to.have.property('imageUrl')
        expect(result.data.ApexUserProfile).to.have.property('kills')
        expect(result.data.ApexUserProfile).to.have.property('level')
        expect(result.data.ApexUserProfile).to.have.property('legends')
        expect(result.data.ApexUserProfile).to.have.property('rankHistory')

        expect(result.data.ApexUserProfile.legends).to.be.an('array')
        expect(result.data.ApexUserProfile.legends.length).to.be.greaterThan(0)
        expect(result.data.ApexUserProfile.legends[0]).to.have.property('name')
        expect(result.data.ApexUserProfile.legends[0]).to.have.property('imageUrl')
        expect(result.data.ApexUserProfile.legends[0]).to.have.property('tallImageUrl')
        expect(result.data.ApexUserProfile.legends[0]).to.have.property('bgImageUrl')
        expect(result.data.ApexUserProfile.legends[0]).to.have.property('kills')
        expect(result.data.ApexUserProfile.legends[0]).to.have.property('isSelected')

        expect(result.data.ApexUserProfile.rankHistory).to.be.an('array')
        expect(result.data.ApexUserProfile.rankHistory.length).to.be.greaterThan(0)
        expect(result.data.ApexUserProfile.rankHistory[0]).to.have.property('rankName')
        expect(result.data.ApexUserProfile.rankHistory[0]).to.have.property('rankValue')
        expect(result.data.ApexUserProfile.rankHistory[0]).to.have.property('rankIconUrl')
        expect(result.data.ApexUserProfile.rankHistory[0]).to.have.property('fechaRegistrado')
        expect(result.data.ApexUserProfile.rankHistory[0]).to.have.property('fechaUnix')
    })
})