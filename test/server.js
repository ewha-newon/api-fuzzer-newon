const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

// Middleware 설정
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 예제 API 엔드포인트
app.post('/openapi3_post_requestBody', (req, res) => {
  const { id, address, profileImage } = req.body;

  if (!id || !address || !profileImage) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  res.status(200).json({
    message: 'Received valid request',
    data: {
      id,
      address,
      profileImage,
    },
  });
});

// 서버 실행
app.listen(port, () => {
  console.log(`API server running at http://localhost:${port}`);
});
