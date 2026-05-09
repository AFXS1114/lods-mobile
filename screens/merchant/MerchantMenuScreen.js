import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, Switch, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuth } from '../../shared/AuthContext';
import { supabase } from '../../shared/supabase';
import { COLORS } from '../../shared/constants';

const EMPTY_FORM = { name: '', description: '', price: '', is_available: true };

export default function MerchantMenuScreen() {
  const { user } = useAuth();
  const [items,      setItems]      = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null); // null = add, object = edit
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);

  useEffect(() => {
    fetchMenu();

    // Realtime: reflect any changes made from the web terminal
    const channel = supabase
      .channel(`merchant-menu-${user.id}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'menu_items',
        filter: `merchant_id=eq.${user.id}`,
      }, () => fetchMenu())
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const fetchMenu = async () => {
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('merchant_id', user.id)
      .order('name', { ascending: true });

    if (!error && data) setItems(data);
    setLoading(false);
    setRefreshing(false);
  };

  const openAdd = () => {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditTarget(item);
    setForm({
      name:         item.name        || '',
      description:  item.description || '',
      price:        String(item.price || ''),
      is_available: item.is_available !== false,
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { Alert.alert('Required', 'Item name is required.'); return; }
    const priceNum = parseFloat(form.price);
    if (isNaN(priceNum) || priceNum < 0) { Alert.alert('Invalid Price', 'Enter a valid price.'); return; }

    setSaving(true);
    const payload = {
      name:         form.name.trim(),
      description:  form.description.trim(),
      price:        priceNum,
      is_available: form.is_available,
      merchant_id:  user.id,
      updated_at:   new Date().toISOString(),
    };

    let error;
    if (editTarget) {
      ({ error } = await supabase.from('menu_items').update(payload).eq('id', editTarget.id));
    } else {
      ({ error } = await supabase.from('menu_items').insert({ ...payload, created_at: new Date().toISOString() }));
    }

    setSaving(false);
    if (error) { Alert.alert('Save Failed', error.message); return; }
    setModalOpen(false);
    fetchMenu();
  };

  const handleDelete = (item) => {
    Alert.alert('Delete Item', `Remove "${item.name}" from the menu?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive', onPress: async () => {
          await supabase.from('menu_items').delete().eq('id', item.id);
          fetchMenu();
        },
      },
    ]);
  };

  const toggleAvailability = async (item) => {
    await supabase
      .from('menu_items')
      .update({ is_available: !item.is_available, updated_at: new Date().toISOString() })
      .eq('id', item.id);
    fetchMenu();
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading menu…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Header ── */}
      <View style={styles.topBar}>
        <View>
          <Text style={styles.title}>Menu Management</Text>
          <Text style={styles.subtitle}>{items.length} item{items.length !== 1 ? 's' : ''}</Text>
        </View>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd} activeOpacity={0.8}>
          <Ionicons name="add" size={22} color="#fff" />
          <Text style={styles.addBtnText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => { setRefreshing(true); fetchMenu(); }}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Ionicons name="restaurant-outline" size={64} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Menu is Empty</Text>
            <Text style={styles.emptySub}>Add your first menu item to get started.</Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={openAdd}>
              <Text style={styles.emptyAddText}>+ Add First Item</Text>
            </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.menuCard}>
            <View style={styles.menuCardLeft}>
              <View style={[styles.availDot, { backgroundColor: item.is_available ? COLORS.accent : COLORS.textDim }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                {item.description ? <Text style={styles.itemDesc} numberOfLines={1}>{item.description}</Text> : null}
              </View>
              <Text style={styles.itemPrice}>₱{Number(item.price || 0).toFixed(2)}</Text>
            </View>
            <View style={styles.menuCardActions}>
              <Switch
                value={item.is_available}
                onValueChange={() => toggleAvailability(item)}
                trackColor={{ false: COLORS.surface, true: COLORS.accent + '55' }}
                thumbColor={item.is_available ? COLORS.accent : COLORS.textMuted}
                style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
              />
              <TouchableOpacity onPress={() => openEdit(item)} style={styles.iconBtn}>
                <Ionicons name="pencil-outline" size={18} color={COLORS.info} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleDelete(item)} style={styles.iconBtn}>
                <Ionicons name="trash-outline" size={18} color={COLORS.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* ── Add / Edit Modal ── */}
      <Modal visible={modalOpen} animationType="slide" transparent presentationStyle="overFullScreen">
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{editTarget ? 'Edit Item' : 'New Menu Item'}</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Item Name *</Text>
              <TextInput
                style={styles.formInput}
                value={form.name}
                onChangeText={(v) => setForm({ ...form, name: v })}
                placeholder="e.g. Burger with Fries"
                placeholderTextColor={COLORS.textDim}
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description</Text>
              <TextInput
                style={[styles.formInput, { height: 70, textAlignVertical: 'top' }]}
                value={form.description}
                onChangeText={(v) => setForm({ ...form, description: v })}
                placeholder="Short description (optional)"
                placeholderTextColor={COLORS.textDim}
                multiline
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Price (₱) *</Text>
              <TextInput
                style={styles.formInput}
                value={form.price}
                onChangeText={(v) => setForm({ ...form, price: v })}
                placeholder="0.00"
                placeholderTextColor={COLORS.textDim}
                keyboardType="decimal-pad"
              />
            </View>

            <View style={styles.availRow}>
              <Text style={styles.formLabel}>Available for Order</Text>
              <Switch
                value={form.is_available}
                onValueChange={(v) => setForm({ ...form, is_available: v })}
                trackColor={{ false: COLORS.surface, true: COLORS.accent + '55' }}
                thumbColor={form.is_available ? COLORS.accent : COLORS.textMuted}
              />
            </View>

            <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.7 }]} onPress={handleSave} disabled={saving}>
              {saving
                ? <ActivityIndicator color="#fff" />
                : <><Ionicons name="checkmark-circle" size={20} color="#fff" /><Text style={styles.saveBtnText}>{editTarget ? 'Save Changes' : 'Add to Menu'}</Text></>
              }
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:   { flex: 1, backgroundColor: COLORS.bg },
  center: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: COLORS.textMuted },
  list:   { padding: 16, paddingBottom: 40 },

  topBar:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', padding: 20, paddingBottom: 12 },
  title:       { fontSize: 24, fontWeight: '800', color: COLORS.text },
  subtitle:    { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  addBtn:      { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: COLORS.primary, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  addBtnText:  { color: '#fff', fontWeight: '700', fontSize: 14 },

  emptyWrap:    { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle:   { fontSize: 18, fontWeight: '700', color: COLORS.textMuted },
  emptySub:     { fontSize: 13, color: COLORS.textDim, textAlign: 'center' },
  emptyAddBtn:  { marginTop: 8, backgroundColor: COLORS.primaryDim, borderRadius: 12, paddingHorizontal: 20, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.primary },
  emptyAddText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },

  menuCard: {
    backgroundColor: COLORS.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: 10, gap: 10,
  },
  menuCardLeft:    { flexDirection: 'row', alignItems: 'center', gap: 12 },
  availDot:        { width: 9, height: 9, borderRadius: 5, marginTop: 2 },
  itemName:        { fontSize: 15, fontWeight: '700', color: COLORS.text },
  itemDesc:        { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  itemPrice:       { fontSize: 16, fontWeight: '800', color: COLORS.primary },
  menuCardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: 8 },
  iconBtn:         { padding: 8 },

  modalOverlay: { flex: 1, backgroundColor: '#000000AA', justifyContent: 'flex-end' },
  modalSheet:   {
    backgroundColor: COLORS.card, borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, gap: 16, borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  modalTitle:  { fontSize: 18, fontWeight: '800', color: COLORS.text },

  formGroup:  { gap: 6 },
  formLabel:  { fontSize: 12, color: COLORS.textMuted, fontWeight: '600', letterSpacing: 0.5 },
  formInput:  {
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14,
    color: COLORS.text, fontSize: 15, borderWidth: 1, borderColor: COLORS.border,
  },
  availRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  saveBtn:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
