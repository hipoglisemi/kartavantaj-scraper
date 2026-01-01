#!/bin/bash

# GitHub Workflow Run Cleanup Script
# Bu script tüm eski workflow run'larını siler

REPO="hipoglisemi/kartavantaj-scraper"

echo "🧹 GitHub Workflow Run'larını Temizleme"
echo "========================================"
echo ""

# GitHub CLI kurulu mu kontrol et
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) kurulu değil!"
    echo "   Kurulum için: brew install gh"
    exit 1
fi

# GitHub'a login olmuş mu kontrol et
if ! gh auth status &> /dev/null; then
    echo "❌ GitHub'a login olmanız gerekiyor!"
    echo "   Çalıştırın: gh auth login"
    exit 1
fi

echo "📋 Mevcut workflow'ları listeleniyor..."
echo ""

# Tüm workflow'ları listele
gh workflow list -R "$REPO"

echo ""
echo "🗑️  Eski workflow run'ları siliniyor..."
echo ""

# Her workflow için tüm run'ları sil
gh run list -R "$REPO" --limit 1000 --json databaseId -q '.[].databaseId' | \
while read -r run_id; do
    echo "   Siliniyor: Run ID $run_id"
    gh run delete "$run_id" -R "$REPO" --yes 2>/dev/null || true
done

echo ""
echo "✅ Temizleme tamamlandı!"
echo ""
echo "📊 Kalan run'lar:"
gh run list -R "$REPO" --limit 10
