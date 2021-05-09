const { ApolloServer } = require("apollo-server")
const resolvers = require("./resolvers")
const typeDefs = require("./typeDefs")
const { jwtValidation } = require("./validateToken")

const server = new ApolloServer({
    typeDefs: typeDefs,
    resolvers: resolvers,
    context: jwtValidation
})

server.listen().then(({url}) => {
    console.log(`GraphQL running at ${url}`)
})