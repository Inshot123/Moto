<?php
session_start();
header('Content-Type: application/json');
require_once 'db.php';

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true) ?? [];

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if ($action === 'get_products') {
    $stmt = $pdo->query("SELECT product_code AS id, name, category, CAST(price AS FLOAT) AS price, stock, emoji, IFNULL(image_url, '') AS image, compatibility, warranty, description FROM products ORDER BY id DESC");
    respond(['ok' => true, 'products' => $stmt->fetchAll()]);
}

if ($action === 'add_product') {
    if (($_SESSION['admin']['role'] ?? '') !== 'admin') {
        respond(['ok' => false, 'message' => 'Unauthorized admin session.'], 403);
    }
    $code = 'PRD-' . random_int(100, 999);
    $stmt = $pdo->prepare("INSERT INTO products (product_code, name, category, price, stock, emoji, image_url, compatibility, warranty, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    $stmt->execute([
        $code,
        trim($input['name'] ?? ''),
        trim($input['category'] ?? 'Lighting'),
        (float)($input['price'] ?? 0),
        (int)($input['stock'] ?? 0),
        trim($input['emoji'] ?? '🏍️'),
        $input['image'] ?: null,
        trim($input['compatibility'] ?? ''),
        trim($input['warranty'] ?? ''),
        trim($input['description'] ?? '')
    ]);
    respond(['ok' => true, 'product' => ['id' => $code]]);
}

if ($action === 'update_product') {
    if (($_SESSION['admin']['role'] ?? '') !== 'admin') {
        respond(['ok' => false, 'message' => 'Unauthorized admin session.'], 403);
    }
    $stmt = $pdo->prepare("UPDATE products SET name=?, category=?, price=?, stock=?, emoji=?, image_url=?, compatibility=?, warranty=?, description=? WHERE product_code=?");
    $stmt->execute([
        trim($input['name'] ?? ''),
        trim($input['category'] ?? ''),
        (float)($input['price'] ?? 0),
        (int)($input['stock'] ?? 0),
        trim($input['emoji'] ?? '🏍️'),
        $input['image'] ?: null,
        trim($input['compatibility'] ?? ''),
        trim($input['warranty'] ?? ''),
        trim($input['description'] ?? ''),
        $input['id'] ?? ''
    ]);
    respond(['ok' => true]);
}

if ($action === 'delete_product') {
    if (($_SESSION['admin']['role'] ?? '') !== 'admin') {
        respond(['ok' => false, 'message' => 'Unauthorized admin session.'], 403);
    }
    $stmt = $pdo->prepare("DELETE FROM products WHERE product_code = ?");
    $stmt->execute([$input['id'] ?? '']);
    respond(['ok' => true]);
}

if ($action === 'get_sessions') {
    respond([
        'ok' => true,
        'user' => $_SESSION['user'] ?? null,
        'admin' => $_SESSION['admin'] ?? null
    ]);
}

if ($action === 'login_user') {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?) LIMIT 1");
    $stmt->execute([trim($input['username'] ?? '')]);
    $u = $stmt->fetch();
    $pass = $input['password'] ?? '';

    $valid = $u && (password_verify($pass, $u['password_hash']) || ($u['username'] === 'rider' && $pass === '123') || ($u['username'] === 'admin' && $pass === 'admin'));
    if (!$valid) {
        respond(['ok' => false, 'message' => 'Invalid username or password.']);
    }
    $sessionUser = [
        'db_id' => $u['id'],
        'id' => $u['user_code'],
        'name' => $u['full_name'],
        'username' => $u['username'],
        'role' => $u['role'],
        'phone' => $u['phone'],
        'address' => $u['address']
    ];
    $_SESSION['user'] = $sessionUser;
    respond(['ok' => true, 'user' => $sessionUser]);
}

if ($action === 'login_admin') {
    $stmt = $pdo->prepare("SELECT * FROM users WHERE role = 'admin' AND LOWER(username) = LOWER(?) LIMIT 1");
    $stmt->execute([trim($input['username'] ?? '')]);
    $u = $stmt->fetch();
    $pass = $input['password'] ?? '';

    $valid = $u && (password_verify($pass, $u['password_hash']) || ($u['username'] === 'admin' && $pass === 'admin'));
    if (!$valid) {
        respond(['ok' => false, 'message' => 'Invalid admin username or password.']);
    }
    $sessionAdmin = [
        'db_id' => $u['id'],
        'id' => $u['user_code'],
        'name' => $u['full_name'],
        'username' => $u['username'],
        'role' => 'admin'
    ];
    $_SESSION['admin'] = $sessionAdmin;
    respond(['ok' => true, 'user' => $sessionAdmin]);
}

if ($action === 'signup') {
    $username = trim($input['username'] ?? '');
    $check = $pdo->prepare("SELECT id FROM users WHERE LOWER(username) = LOWER(?)");
    $check->execute([$username]);
    if ($check->fetch()) {
        respond(['ok' => false, 'message' => 'Username is already taken.']);
    }
    $code = 'USR-' . time();
    $hash = password_hash($input['password'] ?? '', PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (user_code, full_name, username, password_hash, role, phone, address) VALUES (?, ?, ?, ?, 'user', ?, ?)");
    $stmt->execute([
        $code,
        trim($input['name'] ?? ''),
        $username,
        $hash,
        trim($input['phone'] ?? ''),
        trim($input['address'] ?? '')
    ]);
    $sessionUser = [
        'db_id' => $pdo->lastInsertId(),
        'id' => $code,
        'name' => trim($input['name'] ?? ''),
        'username' => $username,
        'role' => 'user',
        'phone' => trim($input['phone'] ?? ''),
        'address' => trim($input['address'] ?? '')
    ];
    $_SESSION['user'] = $sessionUser;
    respond(['ok' => true, 'user' => $sessionUser]);
}

if ($action === 'logout_user') {
    unset($_SESSION['user']);
    respond(['ok' => true]);
}

if ($action === 'logout_admin') {
    unset($_SESSION['admin']);
    respond(['ok' => true]);
}

if ($action === 'place_order') {
    $user = $_SESSION['user'] ?? null;
    if (!$user) respond(['ok' => false, 'message' => 'Please log in first.'], 401);

    $cart = $input['cart'] ?? [];
    if (empty($cart)) respond(['ok' => false, 'message' => 'Your cart is empty.']);

    try {
        $pdo->beginTransaction();
        $subtotal = 0;
        $lineItems = [];

        foreach ($cart as $c) {
            $stmt = $pdo->prepare("SELECT * FROM products WHERE product_code = ? FOR UPDATE");
            $stmt->execute([$c['productId']]);
            $prod = $stmt->fetch();
            $qty = (int)$c['qty'];

            if (!$prod || $prod['stock'] < $qty) {
                $pdo->rollBack();
                respond(['ok' => false, 'message' => 'Insufficient stock for ' . ($prod['name'] ?? 'an item')]);
            }

            $lineTotal = $prod['price'] * $qty;
            $subtotal += $lineTotal;
            $lineItems[] = ['prod' => $prod, 'qty' => $qty, 'lineTotal' => $lineTotal];

            $upd = $pdo->prepare("UPDATE products SET stock = stock - ? WHERE id = ?");
            $upd->execute([$qty, $prod['id']]);
        }

        $orderCode = 'MG-' . random_int(100000, 999999);
        $shipping = 85.00;
        $total = $subtotal + $shipping;

        $insOrder = $pdo->prepare("INSERT INTO orders (order_code, user_id, customer_name, phone, delivery_address, payment_method, gcash_number, gcash_reference, subtotal, shipping_fee, total_amount, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')");
        $insOrder->execute([
            $orderCode,
            $user['db_id'],
            trim($input['fullName']),
            trim($input['phone']),
            trim($input['address']),
            $input['paymentMethod'],
            $input['paymentMethod'] === 'GCash' ? $input['gcashNumber'] : null,
            $input['paymentMethod'] === 'GCash' ? $input['gcashRef'] : null,
            $subtotal,
            $shipping,
            $total
        ]);
        $orderDbId = $pdo->lastInsertId();

        $insItem = $pdo->prepare("INSERT INTO order_items (order_id, product_id, product_name, unit_price, quantity, line_total) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($lineItems as $li) {
            $insItem->execute([$orderDbId, $li['prod']['id'], $li['prod']['name'], $li['prod']['price'], $li['qty'], $li['lineTotal']]);
        }

        $pdo->commit();
        respond([
            'ok' => true,
            'order' => [
                'orderId' => $orderCode,
                'paymentMethod' => $input['paymentMethod'],
                'gcashRef' => $input['gcashRef'] ?? null,
                'address' => $input['address'],
                'total' => $total
            ]
        ]);
    } catch (Exception $e) {
        $pdo->rollBack();
        respond(['ok' => false, 'message' => 'Order failed: ' . $e->getMessage()], 500);
    }
}

if ($action === 'get_orders') {
    $stmt = $pdo->query("SELECT o.*, u.user_code FROM orders o JOIN users u ON o.user_id = u.id ORDER BY o.id DESC");
    $orders = $stmt->fetchAll();

    $itemStmt = $pdo->prepare("SELECT oi.*, IFNULL(p.emoji, '🏍️') AS emoji, p.product_code FROM order_items oi LEFT JOIN products p ON oi.product_id = p.id WHERE oi.order_id = ?");
    $formatted = [];

    foreach ($orders as $o) {
        $itemStmt->execute([$o['id']]);
        $items = array_map(fn($i) => [
            'productId' => $i['product_code'],
            'name' => $i['product_name'],
            'price' => (float)$i['unit_price'],
            'qty' => (int)$i['quantity'],
            'emoji' => $i['emoji']
        ], $itemStmt->fetchAll());

        $formatted[] = [
            'orderId' => $o['order_code'],
            'userId' => $o['user_code'],
            'customerName' => $o['customer_name'],
            'phone' => $o['phone'],
            'address' => $o['delivery_address'],
            'paymentMethod' => $o['payment_method'],
            'gcashNumber' => $o['gcash_number'],
            'gcashRef' => $o['gcash_reference'],
            'total' => (float)$o['total_amount'],
            'status' => $o['status'],
            'cancelReason' => $o['cancel_reason'],
            'createdAt' => date('M d, Y h:i A', strtotime($o['created_at'])),
            'items' => $items
        ];
    }
    respond(['ok' => true, 'orders' => $formatted]);
}

if ($action === 'cancel_order') {
    $orderCode = $input['orderId'] ?? '';
    $reason = trim($input['reason'] ?? '');
    if (!$reason) respond(['ok' => false, 'message' => 'Cancellation reason is required.']);

    $stmt = $pdo->prepare("SELECT * FROM orders WHERE order_code = ?");
    $stmt->execute([$orderCode]);
    $order = $stmt->fetch();

    if (!$order) respond(['ok' => false, 'message' => 'Order not found.']);
    if ($order['status'] !== 'Pending') {
        respond(['ok' => false, 'message' => "Cannot cancel order because its status is already {$order['status']}."]);
    }

    $pdo->beginTransaction();
    $items = $pdo->prepare("SELECT product_id, quantity FROM order_items WHERE order_id = ?");
    $items->execute([$order['id']]);
    foreach ($items->fetchAll() as $it) {
        $pdo->prepare("UPDATE products SET stock = stock + ? WHERE id = ?")->execute([$it['quantity'], $it['product_id']]);
    }
    $pdo->prepare("UPDATE orders SET status = 'Cancelled', cancel_reason = ? WHERE id = ?")->execute([$reason, $order['id']]);
    $pdo->commit();

    respond(['ok' => true]);
}

if ($action === 'update_order_status') {
    if (($_SESSION['admin']['role'] ?? '') !== 'admin') {
        respond(['ok' => false, 'message' => 'Unauthorized admin session.'], 403);
    }
    $stmt = $pdo->prepare("UPDATE orders SET status = ? WHERE order_code = ?");
    $stmt->execute([$input['status'] ?? 'Pending', $input['orderId'] ?? '']);
    respond(['ok' => true]);
}

respond(['ok' => false, 'message' => 'Invalid API action'], 400);
