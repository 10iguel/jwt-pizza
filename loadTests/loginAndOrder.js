import { sleep, check } from 'k6'
import http from 'k6/http'
import jsonpath from 'https://jslib.k6.io/jsonpath/1.0.2/index.js'

export const options = {
    cloud: {
        distribution: { 'amazon:us:ashburn': { loadZone: 'amazon:us:ashburn', percent: 100 } },
        apm: [],
    },
    thresholds: {},
    scenarios: {
        Scenario_1: {
            executor: 'ramping-vus',
            gracefulStop: '30s',
            stages: [
                { target: 20, duration: '1m' },
                { target: 20, duration: '3m30s' },
                { target: 0, duration: '1m' },
            ],
            gracefulRampDown: '30s',
            exec: 'scenario_1',
        },
    },
}

export function scenario_1() {
    let response

    const vars = {}

    // Login
    response = http.put(
        'https://pizza-service.cs329.click/api/auth',
        '{"email":"d@jwt.com","password":"diner"}',
        {
            headers: {
                accept: '*/*',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9,es;q=0.8',
                'content-type': 'application/json',
                origin: 'https://pizza.ronaldinho.click',
                priority: 'u=1, i',
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'cross-site',
                'sec-fetch-storage-access': 'active',
            },
        }
    )

    check(response, {
        'login status is 200': (r) => r.status === 200,  // Adjust to 201 if API uses it for creation
    });

    vars['token'] = jsonpath.query(response.json(), '$.token')[0]

    sleep(3)

    // Get Menu
    response = http.get('https://pizza-service.cs329.click/api/order/menu', {
        headers: {
            accept: '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9,es;q=0.8',
            authorization: `Bearer ${vars['token']}`,
            'content-type': 'application/json',
            'if-none-match': 'W/"1fc-cgG/aqJmHhElGCplQPSmgl2Gwk0"',
            origin: 'https://pizza.ronaldinho.click',
            priority: 'u=1, i',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-storage-access': 'active',
        },
    })

    // Get Franchise
    response = http.get('https://pizza-service.cs329.click/api/franchise?page=0&limit=20&name=*', {
        headers: {
            accept: '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9,es;q=0.8',
            authorization: `Bearer ${vars['token']}`,
            'content-type': 'application/json',
            'if-none-match': 'W/"1f3-DbAFS3lUbf/lu3JpKuRJlggSfhg"',
            origin: 'https://pizza.ronaldinho.click',
            priority: 'u=1, i',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-storage-access': 'active',
        },
    })
    sleep(8.4)

    // Authenticate
    response = http.get('https://pizza-service.cs329.click/api/user/me', {
        headers: {
            accept: '*/*',
            'accept-encoding': 'gzip, deflate, br, zstd',
            'accept-language': 'en-US,en;q=0.9,es;q=0.8',
            authorization: `Bearer ${vars['token']}`,
            'content-type': 'application/json',
            origin: 'https://pizza.ronaldinho.click',
            priority: 'u=1, i',
            'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"Windows"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'cross-site',
            'sec-fetch-storage-access': 'active',
        },
    })
    sleep(3.9)

    // Purchase
    response = http.post(
        'https://pizza-service.cs329.click/api/order',
        '{"items":[{"menuId":1,"description":"Veggie","price":0.0038}],"storeId":"18","franchiseId":19}',
        {
            headers: {
                accept: '*/*',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9,es;q=0.8',
                authorization: `Bearer ${vars['token']}`,
                'content-type': 'application/json',
                origin: 'https://pizza.ronaldinho.click',
                priority: 'u=1, i',
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'cross-site',
                'sec-fetch-storage-access': 'active',
            },
        }
    )

    check(response, {
        'purchase status is 200': (r) => r.status === 200,});

    vars['pizza_jwt'] = jsonpath.query(response.json(), '$.jwt')[0];
    sleep(4)


    // Verify Pizza
    response = http.post(
        'https://pizza-factory.cs329.click/api/order/verify',
        JSON.stringify({jwt: vars['pizza_jwt']}),
        {
            headers: {
                accept: '*/*',
                'accept-encoding': 'gzip, deflate, br, zstd',
                'accept-language': 'en-US,en;q=0.9,es;q=0.8',
                authorization: `Bearer ${vars['token']}`,
                'content-type': 'application/json',
                origin: 'https://pizza.ronaldinho.click',
                priority: 'u=1, i',
                'sec-ch-ua': '"Chromium";v="142", "Google Chrome";v="142", "Not_A Brand";v="99"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'sec-fetch-dest': 'empty',
                'sec-fetch-mode': 'cors',
                'sec-fetch-site': 'cross-site',
                'sec-fetch-storage-access': 'active',
            },
        }
    )
}
