// Tyros Admin - Bottom Sheet & Modal Component (js/sheet.js)
class SheetManager {
  constructor() {
    this.activeSheet = null;
    this.keyHandler = null;
  }

  open({ title, subtitle, content, contentEl, actions = [], onMount, onMounted, onDismiss } = {}) {
    this.close();

    const backdrop = document.createElement('div');
    backdrop.className = 'sheet-backdrop';
    backdrop.id = 'active-modal-backdrop';

    const sheet = document.createElement('div');
    sheet.className = 'sheet-container';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');

    // Drag handle for iOS feel
    const handle = document.createElement('div');
    handle.className = 'sheet-handle';
    sheet.appendChild(handle);

    // Title & Close Header if title is provided
    if (title) {
      const headerRow = document.createElement('div');
      headerRow.style.display = 'flex';
      headerRow.style.justifyContent = 'space-between';
      headerRow.style.alignItems = 'flex-start';
      headerRow.style.marginBottom = subtitle ? '4px' : '16px';

      const titleWrap = document.createElement('div');
      const h3 = document.createElement('h3');
      h3.className = 'sheet-title';
      h3.style.fontFamily = 'var(--font-display, var(--font-condensed))';
      h3.style.fontSize = '20px';
      h3.style.fontWeight = '700';
      h3.style.color = 'var(--text-primary, var(--text-main))';
      h3.style.lineHeight = '1.2';
      h3.style.margin = '0';
      h3.textContent = title;
      titleWrap.appendChild(h3);

      if (subtitle) {
        const p = document.createElement('p');
        p.className = 'sheet-sub';
        p.style.fontSize = '13px';
        p.style.color = 'var(--text-muted)';
        p.style.marginTop = '4px';
        p.style.marginBottom = '0';
        p.textContent = subtitle;
        titleWrap.appendChild(p);
      }

      headerRow.appendChild(titleWrap);

      const closeBtn = document.createElement('button');
      closeBtn.className = 'sheet-close-btn';
      closeBtn.setAttribute('aria-label', 'Close dialog');
      closeBtn.style.background = 'none';
      closeBtn.style.border = 'none';
      closeBtn.style.padding = '4px 8px';
      closeBtn.style.cursor = 'pointer';
      closeBtn.style.color = 'var(--text-muted)';
      closeBtn.style.fontSize = '20px';
      closeBtn.style.lineHeight = '1';
      closeBtn.innerHTML = '&times;';
      closeBtn.addEventListener('click', () => {
        if (onDismiss) onDismiss();
        this.close();
      });
      headerRow.appendChild(closeBtn);

      sheet.appendChild(headerRow);
    } else if (subtitle) {
      const p = document.createElement('p');
      p.className = 'sheet-sub';
      p.style.fontSize = '13px';
      p.style.color = 'var(--text-muted)';
      p.style.marginTop = '4px';
      p.style.marginBottom = '16px';
      p.textContent = subtitle;
      sheet.appendChild(p);
    }

    // Content: string or element
    if (content) {
      if (typeof content === 'string') {
        const wrap = document.createElement('div');
        wrap.className = 'sheet-content-wrap';
        wrap.innerHTML = content;
        sheet.appendChild(wrap);
      } else if (content instanceof HTMLElement) {
        sheet.appendChild(content);
      }
    } else if (contentEl) {
      sheet.appendChild(contentEl);
    }

    // Actions container
    if (actions.length > 0) {
      const actionsDiv = document.createElement('div');
      actionsDiv.className = 'sheet-actions';
      actionsDiv.style.display = 'flex';
      actionsDiv.style.gap = '10px';
      actionsDiv.style.marginTop = '20px';
      actionsDiv.style.justifyContent = 'flex-end';

      actions.forEach(action => {
        const btn = document.createElement('button');
        btn.className = action.primary ? 'btn-primary' : 'btn-secondary';
        btn.textContent = action.label;
        btn.style.flex = action.fullWidth ? '1' : 'initial';
        if (action.danger) {
          btn.style.backgroundColor = 'var(--status-overdue)';
          btn.style.color = '#FFFFFF';
        }
        btn.addEventListener('click', async (e) => {
          if (action.onClick) {
            await action.onClick(e);
          }
          this.close();
        });
        actionsDiv.appendChild(btn);
      });

      sheet.appendChild(actionsDiv);
    }

    backdrop.appendChild(sheet);
    document.body.appendChild(backdrop);

    // Call onMount / onMounted hook
    const mountFn = onMount || onMounted;
    if (typeof mountFn === 'function') {
      try {
        mountFn(sheet);
      } catch (err) {
        console.error('[Sheet] Error during onMount callback:', err);
      }
    }

    // Animate in
    requestAnimationFrame(() => {
      backdrop.classList.add('active');
    });

    // Close on backdrop tap
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        if (onDismiss) onDismiss();
        this.close();
      }
    });

    // Close on Escape
    this.keyHandler = (e) => {
      if (e.key === 'Escape') {
        if (onDismiss) onDismiss();
        this.close();
      }
    };
    window.addEventListener('keydown', this.keyHandler);

    this.activeSheet = backdrop;
    return sheet;
  }

  show(options = {}) {
    return this.open(options);
  }

  confirm({ title = 'Confirm Action', message = 'Are you sure you want to proceed?', confirmText = 'Confirm', danger = false, onConfirm }) {
    const p = document.createElement('p');
    p.style.fontSize = '14px';
    p.style.color = 'var(--text-secondary)';
    p.style.marginTop = '6px';
    p.textContent = message;

    return this.open({
      title,
      contentEl: p,
      actions: [
        { label: 'Cancel', primary: false },
        { label: confirmText, primary: true, danger, onClick: onConfirm }
      ]
    });
  }

  close() {
    if (!this.activeSheet) {
      const orphan = document.getElementById('active-modal-backdrop');
      if (orphan) orphan.remove();
      return;
    }
    const sheet = this.activeSheet;
    sheet.classList.remove('active');
    if (this.keyHandler) {
      window.removeEventListener('keydown', this.keyHandler);
      this.keyHandler = null;
    }
    setTimeout(() => {
      if (sheet.parentNode) {
        sheet.parentNode.removeChild(sheet);
      }
    }, 250);
    this.activeSheet = null;
  }
}

export const Sheet = new SheetManager();
if (typeof window !== 'undefined') {
  window.Sheet = Sheet;
}

