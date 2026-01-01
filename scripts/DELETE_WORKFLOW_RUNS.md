# GitHub Workflow Run'larını Silme Rehberi

## Yöntem 1: GitHub Web Arayüzü (Önerilen)

### Tek Tek Silme
1. https://github.com/hipoglisemi/kartavantaj-scraper/actions adresine git
2. Sol taraftan workflow seç (örn: "Akbank Scraper")
3. Her run'ın sağındaki `...` menüsünden "Delete workflow run" seç

### Toplu Silme (Browser Console)
1. https://github.com/hipoglisemi/kartavantaj-scraper/actions adresine git
2. Browser'da Developer Console'u aç (F12 veya Cmd+Option+I)
3. Aşağıdaki kodu yapıştır ve Enter'a bas:

```javascript
// Tüm "Delete workflow run" butonlarını bul ve tıkla
async function deleteAllRuns() {
    const buttons = document.querySelectorAll('[aria-label="Delete workflow run"]');
    console.log(`${buttons.length} workflow run bulundu`);
    
    for (let i = 0; i < buttons.length; i++) {
        buttons[i].click();
        await new Promise(r => setTimeout(r, 500)); // 500ms bekle
        
        // Confirm butonunu bul ve tıkla
        const confirmBtn = document.querySelector('button[type="submit"]');
        if (confirmBtn) confirmBtn.click();
        
        await new Promise(r => setTimeout(r, 1000)); // 1s bekle
        console.log(`${i + 1}/${buttons.length} silindi`);
    }
    
    console.log('Tamamlandı! Sayfayı yenile ve tekrar çalıştır.');
}

deleteAllRuns();
```

**Not**: Bu script bir seferde görünen run'ları siler. Daha fazla varsa sayfayı yenile ve tekrar çalıştır.


## Yöntem 2: GitHub CLI (Gelişmiş)

### GitHub CLI Kurulumu
```bash
brew install gh
gh auth login
```

### Script Çalıştırma
```bash
./scripts/cleanup_workflow_runs.sh
```

## Yöntem 3: GitHub API (Manuel)

### Belirli Bir Workflow'un Tüm Run'larını Sil
```bash
# Önce workflow ID'yi bul
curl -H "Authorization: token YOUR_GITHUB_TOKEN" \
  https://api.github.com/repos/hipoglisemi/kartavantaj-scraper/actions/workflows

# Sonra o workflow'un run'larını sil
WORKFLOW_ID="12345"
curl -X DELETE -H "Authorization: token YOUR_GITHUB_TOKEN" \
  "https://api.github.com/repos/hipoglisemi/kartavantaj-scraper/actions/workflows/$WORKFLOW_ID/runs"
```

## Önerilen Yaklaşım

**En kolay**: Browser Console yöntemi (Yöntem 1)
- Hızlı ve kolay
- Token gerektirmez
- Görsel kontrol imkanı

**En güçlü**: GitHub CLI (Yöntem 2)
- Otomatik
- Toplu işlem
- Script edilebilir
