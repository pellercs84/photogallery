module.exports = async function (context, req) {
    context.log('VerifyPassword function triggered');

    try {
        const expectedPassword = process.env.GALLERY_PASSWORD;

        if (!expectedPassword) {
            context.log.error('GALLERY_PASSWORD not configured in environment variables');
            context.res = {
                status: 500,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ error: 'Server configuration error' })
            };
            return;
        }

        const { password } = req.body;

        if (password === expectedPassword) {
            context.res = {
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ valid: true })
            };
        } else {
            context.res = {
                status: 200, // Return 200 so client can process the "valid: false" response
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                body: JSON.stringify({ valid: false })
            };
        }
    } catch (error) {
        context.log.error('Error verifying password:', error);
        context.res = {
            status: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({ error: 'Internal server error' })
        };
    }
};
