const express = require('express');
const {ApolloGateway, IntrospectAndCompose} = require('@apollo/gateway');
const {ApolloServer} = require('apollo-server-express');
const cors = require('cors');
const {express: voyagerMiddleware} = require('graphql-voyager/middleware');

const app = express();

// Массив разрешённых источников для CORS запросов
const allowedOrigins = [
    'http://localhost:4000',
    'https://studio.apollographql.com'
];

// Настройка CORS
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, origin);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
}));

// Настройка Gateway с указанием списка сервисов бекенда
const gateway = new ApolloGateway({
    supergraphSdl: new IntrospectAndCompose({
        subgraphs: [
            {name: 'workflow-service', url: 'http://localhost:20301/graphql'},
            {name: 'metadata-service', url: 'http://localhost:20302/graphql'},
        ],
    }),
});

// Создаём сервер с Apollo Gateway
const server = new ApolloServer({
    gateway,
    introspection: true,
});

// Функция для получения схемы с Apollo Server
const getIntrospectionQuery = async () => {
    const fetch = (await import('node-fetch')).default; // Динамический импорт
    const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
            query: `
            {
              __schema {
                types {
                  name
                }
              }
            }`,
        }),
    });

    const result = await response.json();
    return result.data;
};

// Применяем middleware Apollo Server к Express
server.start().then(() => {
    server.applyMiddleware({app, cors: false});

    // Настройка маршрута для GraphQL Voyager
    app.use('/voyager', voyagerMiddleware({
        endpointUrl: 'http://localhost:4000/graphql',
        introspection: getIntrospectionQuery,
    }));

    // Запуск Express сервера на порту 4000
    app.listen(4000, () => {
        console.log('🚀 Apollo Server ready at http://localhost:4000/graphql');
        console.log('🚀 GraphQL Voyager ready at http://localhost:4000/voyager');
    });
});