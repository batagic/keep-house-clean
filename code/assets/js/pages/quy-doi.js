/* ── Calculator ── */
  const RATE = typeof GRAIN_RATE !== 'undefined' ? GRAIN_RATE : 100;
  const GOALS = [200, 250, 300, 350, 600, 850, 900, 1600, 2000, 800, 1200, 1200, 1600, 2400, 4000];

  function formatVND(n) {
    return n.toLocaleString('vi-VN') + ' VNĐ';
  }

  function calculate() {
    const input = document.getElementById('grainInput');
    const grains = Math.max(0, parseInt(input.value) || 0);
    const cash = grains * RATE;

    document.getElementById('cashResult').textContent = formatVND(cash);

    let note = 'Bắt đầu nhập số Gạo để xem kết quả ✨';
    if(grains > 0   && grains < 200)   note = `Chưa đủ thẻ bài nhỏ nhất — cố thêm chút nữa! 💪`;
    if(grains >= 200  && grains < 600)  note = `Đủ đổi thẻ Bảo Khí, Hàn Băng hoặc Mật Đạo rồi! 🍿`;
    if(grains >= 600  && grains < 900)  note = `Tốt! Đủ Lệnh Trưng Thu hoặc Đèn Dầu Thắp Muộn 🏮`;
    if(grains >= 900  && grains < 1200) note = `Khá lắm! Đủ Bù Nhìn Thế Thân — nghỉ 1 ngày việc nhà 🌾`;
    if(grains >= 1200 && grains < 1600) note = `Tốt lắm! Đủ Mâm Cỗ hoặc bắt đầu Đêm Phim Gia Đình 🍲`;
    if(grains >= 1600 && grains < 2400) note = `Xuất sắc! Đủ Khuôn Bánh Chưng hoặc Giấy Thông Hành 🧭`;
    if(grains >= 2400 && grains < 4000) note = `Wow — đủ mời 2 bạn đến nhà chơi rồi! 🏰`;
    if(grains >= 4000 && grains < 8000) note = `Đỉnh cao! Đủ đãi cả nhà ăn nhà hàng bình dân 🍕`;
    if(grains >= 8000)                  note = `ĐẠI ĐIỀN CHỦ! Đủ bữa tiệc nhà hàng sang xịn cho cả gia đình 👑`;
    document.getElementById('calcNote').textContent = note;

    const pct = Math.min(100, Math.round((grains / 8000) * 100));
    document.getElementById('progressFill').style.width = pct + '%';
    document.getElementById('progressPct').textContent = pct + '%';

    GOALS.forEach((cost, i) => {
      const el = document.getElementById('goal-' + i);
      if(!el) return;
      const row = el.closest('.goal-item');
      if(grains >= cost){
        el.textContent = '✅ Đủ rồi!';
        el.className = 'goal-status unlocked';
        row.classList.add('can-afford');
      } else {
        const need = cost - grains;
        el.textContent = `🔒 Còn thiếu ${need.toLocaleString('vi-VN')}🌾`;
        el.className = 'goal-status locked';
        row.classList.remove('can-afford');
      }
    });
  }

  function reverseCalc() {
    const cash = parseInt(document.getElementById('cashInput').value) || 0;
    const grains = Math.ceil(cash / RATE);
    document.getElementById('reverseResult').textContent = grains > 0 ? grains.toLocaleString('vi-VN') + ' 🌾' : '— 🌾';
  }

  function setAmount(n) {
    document.getElementById('grainInput').value = n;
    calculate();
    document.getElementById('grainInput').focus();
  }

  /* ── Chart ── */
  /* ── Chart ── */
  window.addEventListener('DOMContentLoaded', () => {
    const ctx = document.getElementById('rewardsChart').getContext('2d');
    new Chart(ctx, {
      type: 'bar',
      data: {
        // Đã bổ sung 4 thẻ bài thiếu, đồng nhất tên "Gói Mở Mang Bờ Cõi" và sắp xếp từ thấp đến cao
        labels: [
          'Bảo Khí\nGiòn Rụm', 'Hàn Băng\nNgọc Thạch', 'Mật Đạo\nTiêu Dao', 
          'Đèn Dầu\nThắp Muộn', 'Lệnh Trưng\nThu Đất', 'Mở Mang\nBờ Cõi', 
          'Phiên Chợ\nTự Do', 'Bù Nhìn\nThế Thân', 'Mâm Cỗ\nVụ Mùa', 
          'Đêm Phim\nGia Đình', 'Khuôn\nBánh Chưng', 'Thông Hành\nViễn Chinh', 
          'Hạt Nếp\nThần Lực', 'Mở Cổng\nThành', 'Kinh Lý\nĐô Thành'
        ],
        datasets: [
          {
            label: 'Số Hạt Gạo',
            data: [200, 250, 300, 350, 600, 800, 850, 900, 1200, 1200, 1600, 1600, 2000, 2400, 4000],
            backgroundColor: [
              'rgba(245,166,35,.75)', // Thẻ bài - Amber
              'rgba(245,166,35,.75)',
              'rgba(245,166,35,.75)',
              'rgba(245,166,35,.75)',
              'rgba(245,166,35,.75)',
              'rgba(74,190,122,.75)', // Quà tặng dài hạn - Green light
              'rgba(245,166,35,.75)', 
              'rgba(245,166,35,.75)',
              'rgba(45,138,85,.75)',  // Quà tặng dài hạn - Green mid
              'rgba(45,138,85,.75)',  
              'rgba(245,166,35,.75)', 
              'rgba(45,138,85,.75)',  
              'rgba(245,166,35,.75)', 
              'rgba(26,92,56,.75)',   // Quà tặng dài hạn - Green deep
              'rgba(26,92,56,.75)',   
            ],
            borderColor: [
              '#f5a623', '#f5a623', '#f5a623', '#f5a623', '#f5a623', 
              '#4abe7a', '#f5a623', '#f5a623', '#2d8a55', '#2d8a55', 
              '#f5a623', '#2d8a55', '#f5a623', '#1a5c38', '#1a5c38'
            ],
            borderWidth: 2,
            borderRadius: 6,
          }
        ]
      },
      options: {
        indexAxis: 'y', // Tham số quan trọng: Chuyển biểu đồ sang nằm ngang
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: { right: 60 } // Tạo không gian lề phải để vẽ số liệu không bị cắt chũ
        },
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: "'Baloo 2', sans-serif", weight: '700' } }
          },
          tooltip: {
            backgroundColor: 'rgba(13,43,26,.95)',
            padding: 12,
            titleFont: { size:13, weight:'bold' },
            bodyFont: { size:12 },
            callbacks: {
              // Gộp hiển thị VNĐ vào tooltip để biểu đồ trông gọn gàng hơn
              label: function(ctx) {
                return `  ${ctx.raw} Hạt Gạo (${(ctx.raw * 100).toLocaleString('vi-VN')} VNĐ)`;
              }
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            grid: { color: '#f0faf4' },
            title: { display:true, text:'Số lượng Hạt Gạo 🌾', font:{weight:'bold'} },
            // Mở rộng trục X thêm một chút so với giá trị lớn nhất (4000)
            suggestedMax: 4500 
          },
          y: {
            grid: { display:false },
            ticks: {
              font: { size: 11, family: "'Mulish', sans-serif", weight: '600' }
            }
          }
        }
      },
      // Plugin tự định nghĩa (Inline Plugin) để hiển thị số liệu ở cuối mỗi thanh
      plugins: [{
        id: 'dataLabelsAtEnd',
        afterDatasetsDraw(chart) {
          const { ctx } = chart;
          chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            if (meta.hidden) return;
            meta.data.forEach((bar, index) => {
              const dataValue = dataset.data[index];
              ctx.fillStyle = '#1a5c38'; // Màu chữ text-main / green-deep
              ctx.font = 'bold 12px "Mulish"';
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              // Vẽ chữ số cách điểm cuối của thanh (bar.x) khoảng 8px
              ctx.fillText(dataValue + ' 🌾', bar.x + 8, bar.y);
            });
          });
        }
      }]
    });
  });
