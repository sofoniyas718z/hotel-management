<?php
class Booking {
    private $conn;
    private $table = 'bookings';

    public $id;
    public $customer_id;
    public $room_id;
    public $check_in;
    public $check_out;
    public $total_guests;
    public $total_amount;
    public $status;
    public $payment_status;
    public $special_requests;

    public function __construct($db) {
        $this->conn = $db;
    }

    public function create() {
        $query = 'INSERT INTO ' . $this->table . ' 
                 SET customer_id = :customer_id, 
                     room_id = :room_id, 
                     check_in = :check_in, 
                     check_out = :check_out, 
                     total_guests = :total_guests, 
                     total_amount = :total_amount, 
                     status = :status, 
                     payment_status = :payment_status, 
                     special_requests = :special_requests';

        $stmt = $this->conn->prepare($query);

        // Bind data
        $stmt->bindParam(':customer_id', $this->customer_id);
        $stmt->bindParam(':room_id', $this->room_id);
        $stmt->bindParam(':check_in', $this->check_in);
        $stmt->bindParam(':check_out', $this->check_out);
        $stmt->bindParam(':total_guests', $this->total_guests);
        $stmt->bindParam(':total_amount', $this->total_amount);
        $stmt->bindParam(':status', $this->status);
        $stmt->bindParam(':payment_status', $this->payment_status);
        $stmt->bindParam(':special_requests', $this->special_requests);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }

    public function read() {
        $query = 'SELECT 
                    b.*,
                    r.room_number,
                    r.room_type,
                    r.price_per_night,
                    c.first_name,
                    c.last_name,
                    c.email,
                    c.phone
                  FROM ' . $this->table . ' b
                  LEFT JOIN rooms r ON b.room_id = r.id
                  LEFT JOIN customers c ON b.customer_id = c.id
                  ORDER BY b.created_at DESC';

        $stmt = $this->conn->prepare($query);
        $stmt->execute();
        return $stmt;
    }

    public function updateStatus() {
        $query = 'UPDATE ' . $this->table . ' 
                  SET status = :status 
                  WHERE id = :id';

        $stmt = $this->conn->prepare($query);
        $stmt->bindParam(':status', $this->status);
        $stmt->bindParam(':id', $this->id);

        if ($stmt->execute()) {
            return true;
        }
        return false;
    }
}
?>